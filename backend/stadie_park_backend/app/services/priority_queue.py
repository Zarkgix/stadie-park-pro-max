"""Adaptive Priority Scheduling (APS) Engine for vehicle slot allocation."""
from datetime import datetime, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session
from ..models.vehicle import Vehicle
from ..models.parking_slot import ParkingSlot


class APSEngine:
    """Implements the Adaptive Priority Scheduling algorithm."""
    
    # Category weights
    CATEGORY_WEIGHTS = {
        "ambulance": 10.0,      # Emergency
        "vvip": 8.0,            # VVIP
        "bus": 5.0,             # Public Service
        "logistics": 3.0,       # Logistics (not used yet, but for future)
        "private": 1.0,         # General
    }
    
    # Time bonus threshold: 30 minutes
    TIME_BONUS_THRESHOLD_MINUTES = 30
    TIME_BONUS_POINTS = 3.0
    
    # Zone adjustment threshold: 85% occupancy
    ZONE_OCCUPANCY_THRESHOLD = 0.85
    ZONE_ADJUSTMENT = -1.0
    
    # Wait bonus for general vehicles: +0.1 per minute
    WAIT_BONUS_PER_MINUTE = 0.1
    GENERAL_VEHICLE_WAIT_THRESHOLD_MINUTES = 20  # After 20 min, equals VVIP
    
    @staticmethod
    def get_category_weight(category: str) -> float:
        """Get category weight by category name."""
        return APSEngine.CATEGORY_WEIGHTS.get(category.lower(), 1.0)
    
    @staticmethod
    def get_urgency_multiplier(is_emergency: bool = False) -> float:
        """Get urgency multiplier. Returns 2.0 if emergency, else 1.0."""
        return 2.0 if is_emergency else 1.0
    
    @staticmethod
    def get_time_bonus(arrival_time: datetime) -> float:
        """
        Calculate time bonus.
        +3 points for vehicles arriving within 30 minutes of event start.
        For now, we use registration time as reference.
        """
        if arrival_time is None:
            return 0.0
        
        time_diff = datetime.utcnow() - arrival_time
        minutes_elapsed = time_diff.total_seconds() / 60
        
        if minutes_elapsed <= APSEngine.TIME_BONUS_THRESHOLD_MINUTES:
            # Linear bonus: full 3 points at arrival, decreases over 30 minutes
            bonus = APSEngine.TIME_BONUS_POINTS * (1 - minutes_elapsed / APSEngine.TIME_BONUS_THRESHOLD_MINUTES)
            return max(0, bonus)
        return 0.0
    
    @staticmethod
    def get_zone_adjustment(zone_id: Optional[int], db: Session) -> float:
        """
        Calculate zone adjustment.
        -1 point if preferred zone exceeds 85% occupancy.
        """
        if zone_id is None:
            return 0.0
        
        zone = db.query(ParkingSlot).filter(
            ParkingSlot.zone_id == zone_id
        ).all()
        
        if not zone:
            return 0.0
        
        total_slots = len(zone)
        occupied_slots = sum(1 for slot in zone if slot.occupied)
        occupancy = occupied_slots / total_slots if total_slots > 0 else 0
        
        if occupancy > APSEngine.ZONE_OCCUPANCY_THRESHOLD:
            return APSEngine.ZONE_ADJUSTMENT
        return 0.0
    
    @staticmethod
    def get_wait_bonus(category: str, waiting_time_minutes: float) -> float:
        """
        Calculate wait bonus.
        For General vehicles: +0.1 per minute.
        After 20 minutes, General vehicle reaches VVIP base score (8).
        """
        if category.lower() != "private":
            return 0.0
        
        # General vehicle wait bonus
        wait_bonus = waiting_time_minutes * APSEngine.WAIT_BONUS_PER_MINUTE
        return wait_bonus
    
    @staticmethod
    def calculate_priority_score(
        vehicle: Vehicle,
        db: Session,
        is_emergency: bool = False,
        creation_time: Optional[datetime] = None
    ) -> float:
        """
        Calculate priority score using the formula:
        Priority Score = (Category Weight × Urgency Multiplier) + Time Bonus + Zone Adjustment + Wait Bonus
        
        Args:
            vehicle: Vehicle object
            db: Database session
            is_emergency: Whether there's an active emergency
            creation_time: Vehicle creation/registration time (for time bonus calculation)
        
        Returns:
            Priority score (float)
        """
        # Base score
        category_weight = APSEngine.get_category_weight(vehicle.category)
        urgency_multiplier = APSEngine.get_urgency_multiplier(is_emergency)
        base_score = category_weight * urgency_multiplier
        
        # Time bonus
        time_bonus = APSEngine.get_time_bonus(creation_time)
        
        # Zone adjustment
        zone_adjustment = APSEngine.get_zone_adjustment(vehicle.parking_slot_id, db)
        
        # Wait bonus
        waiting_time_minutes = vehicle.waiting_time / 60.0 if vehicle.waiting_time else 0.0
        wait_bonus = APSEngine.get_wait_bonus(vehicle.category, waiting_time_minutes)
        
        # Total score
        total_score = base_score + time_bonus + zone_adjustment + wait_bonus
        return max(0, total_score)  # Ensure non-negative
    
    @staticmethod
    def get_priority_queue(db: Session, is_emergency: bool = False) -> List[dict]:
        """
        Get all waiting vehicles sorted by priority score (descending).
        
        Args:
            db: Database session
            is_emergency: Whether there's an active emergency
        
        Returns:
            List of vehicles with calculated scores, sorted by score (highest first)
        """
        # Get all waiting vehicles
        waiting_vehicles = db.query(Vehicle).filter(
            Vehicle.status == "waiting"
        ).all()
        
        vehicles_with_scores = []
        for vehicle in waiting_vehicles:
            score = APSEngine.calculate_priority_score(vehicle, db, is_emergency)
            vehicles_with_scores.append({
                "vehicle": vehicle,
                "score": score,
                "category": vehicle.category,
                "plate": vehicle.plate_number,
                "urgency": vehicle.urgency,
            })
        
        # Sort by score descending (highest priority first)
        vehicles_with_scores.sort(key=lambda x: x["score"], reverse=True)
        return vehicles_with_scores
    
    @staticmethod
    def allocate_slot(vehicle: Vehicle, slot: ParkingSlot, db: Session) -> bool:
        """
        Allocate a parking slot to a vehicle.
        
        Args:
            vehicle: Vehicle to allocate
            slot: Parking slot to assign
            db: Database session
        
        Returns:
            True if allocation successful, False otherwise
        """
        try:
            slot.occupied = True
            vehicle.parking_slot_id = slot.id
            vehicle.status = "allocated"
            db.commit()
            return True
        except Exception as e:
            db.rollback()
            print(f"Error allocating slot: {e}")
            return False
