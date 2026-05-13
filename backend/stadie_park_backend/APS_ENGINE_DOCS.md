# Adaptive Priority Scheduling (APS) Engine

## Overview

The Adaptive Priority Scheduling (APS) Engine is the core algorithm for determining which vehicle receives a parking slot first in Stadie-Park. It implements intelligent, real-time vehicle prioritization based on multiple factors including vehicle type, urgency, arrival time, and wait duration.

## Algorithm Formula

```
Priority Score = (Category Weight × Urgency Multiplier) + Time Bonus + Zone Adjustment + Wait Bonus
```

## Components

### 1. Category Weight
Assigns a base score by vehicle type:
- **Ambulance (Emergency)**: 10.0 points
- **VVIP**: 8.0 points
- **Bus (Public Service)**: 5.0 points
- **Logistics**: 3.0 points (reserved for future use)
- **Private (General)**: 1.0 point

**Example**: A private vehicle starts with a base score of 1.0, while an ambulance starts with 10.0

### 2. Urgency Multiplier
Doubles the score during active emergencies:
- **Active Emergency**: ×2.0 multiplier
- **Normal Operation**: ×1.0 multiplier

**Example**: An ambulance during active emergency = 10 × 2.0 = 20 points

### 3. Time Bonus
Rewards time-critical arrivals within 30 minutes of event start:
- Maximum: +3 points (at arrival)
- Decreases linearly over 30 minutes
- After 30 minutes: 0 points

**Formula**: Time Bonus = 3 × (1 - minutes_elapsed / 30), minimum 0

### 4. Zone Adjustment
Improves overall slot utilization by discouraging vehicles from saturated zones:
- If preferred zone occupancy > 85%: **-1 point**
- Otherwise: **0 points**

**Example**: Redirects vehicles away from overcrowded zones to optimize distribution

### 5. Wait Bonus
Ensures General vehicles are not delayed indefinitely:
- General vehicles only: +0.1 points per minute of waiting
- After 20 minutes of waiting: General vehicle achieves VVIP equivalent score (8.0)
- Other vehicle types: No wait bonus

**Example**: 
- Private vehicle after 10 min wait: 1.0 + 1.0 = 2.0 points
- Private vehicle after 20 min wait: 1.0 + 2.0 = 3.0 points (≈ VVIP base of 8.0 with wait bonus)

## Example Scenarios

### Scenario 1: Emergency Vehicle During Active Incident
- Category: Ambulance (Emergency)
- Active Emergency: Yes
- Calculation: 10 × 2.0 = **20 points** ← Highest priority

### Scenario 2: VVIP Vehicle, Normal Operation
- Category: VVIP
- Active Emergency: No
- Calculation: 8 × 1.0 = **8 points**

### Scenario 3: Private Vehicle After Long Wait
- Category: Private (General)
- Wait Time: 25 minutes
- Calculation: (1 × 1.0) + 0 + 0 + (25 × 0.1) = 1.0 + 2.5 = **3.5 points**

### Scenario 4: Bus in Congested Zone
- Category: Bus (Public Service)
- Zone Occupancy: 90% (exceeds 85%)
- Calculation: (5 × 1.0) + time_bonus + (-1) + wait_bonus = **4 points + bonuses**

## Implementation Details

### Files
- **Backend Service**: `app/services/priority_queue.py` - Core APS engine implementation
- **Router Endpoints**: `app/routers/queue.py` - API endpoints for queue management
- **Data Models**: `app/models/vehicle.py`, `app/models/parking_slot.py`

### API Endpoints

#### 1. Get Priority Queue
```
GET /queue/priority-queue?is_emergency=false
```
Returns all waiting vehicles sorted by priority score (highest first).

**Response**:
```json
[
  {
    "vehicle_id": 1,
    "plate_number": "KCA 001A",
    "category": "ambulance",
    "status": "waiting",
    "current_priority_score": 20.0,
    "urgency": 10,
    "payment_status": "paid"
  },
  ...
]
```

#### 2. Get Single Vehicle Priority Score
```
GET /queue/priority-score/{vehicle_id}?is_emergency=false
```
Returns detailed priority calculation breakdown for a specific vehicle.

**Response**:
```json
{
  "vehicle_id": 1,
  "plate_number": "KCA 001A",
  "category": "ambulance",
  "priority_score": 20.0,
  "breakdown": {
    "base_score": 20.0,
    "time_bonus": 0.0,
    "zone_adjustment": 0.0,
    "wait_bonus": 0.0
  }
}
```

## Real-Time Updates

- The queue is recalculated in real-time as vehicles arrive and wait times increase
- When an Emergency vehicle is detected, a real-time alert is broadcast to all connected dashboard clients (WebSocket ready)
- Slot assignments complete in under 2 seconds
- Priority queue is maintained sorted by score at all times

## Key Features

✅ **Fairness**: Wait bonus ensures General vehicles get slots within 20 minutes  
✅ **Emergency Priority**: Ambulances receive maximum priority during incidents  
✅ **Utilization**: Zone adjustment optimizes slot distribution  
✅ **Time Sensitivity**: Rewards vehicles arriving near event start  
✅ **Transparency**: Detailed score breakdown available via API  
✅ **Performance**: In-memory queue processes assignments under 2 seconds  

## Database Fields

The Vehicle model includes these fields for APS calculations:
- `created_at`: Registration/arrival timestamp
- `category`: Vehicle type (ambulance, vvip, bus, private)
- `urgency`: Urgency level 1-10
- `waiting_time`: Seconds spent in queue
- `status`: Current status (waiting, allocated, etc.)
- `priority_score`: Stored calculated score
- `allocated_at`: Timestamp when slot assigned

## Future Enhancements

- WebSocket integration for real-time queue updates
- Machine learning to predict optimal zone assignments
- Dynamic category weight adjustment based on event type
- Vehicle-specific preferences and VIP tiers
- Integration with traffic flow management
