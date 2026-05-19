"""
Interactive Adaptive Priority Scheduling (APS) Demo
Zachary Gitahi | Smart Stadium Parking Allocation

What this version does:
1. Lets you input vehicle type: Ambulance, VVIP, Bus, or General.
2. Automatically recalculates APS priority score.
3. Sorts the list so the highest-priority vehicle appears on top.
4. Lets you add waiting time to:
   - the current top vehicle,
   - the next General vehicle,
   - or any specific vehicle by ID.
5. Lets you add 3 minutes, 20 minutes, or custom minutes.
6. Lets you process/remove the top vehicle as the next allocation.

APS Formula:
Score = (Category Weight × Urgency Multiplier) + Time Bonus + Zone Adjustment + Wait Bonus

Vehicle mapping:
Ambulance -> Emergency
VVIP      -> VVIP
Bus       -> Public Service
General   -> General
"""

from dataclasses import dataclass, field
from typing import List, Optional
import itertools


# -----------------------------
# APS ALGORITHM CONSTANTS
# -----------------------------
CATEGORY_WEIGHTS = {
    "Ambulance": 10.0,
    "VVIP": 8.0,
    "Bus": 5.0,
    "General": 1.0,
}

URGENCY_MULTIPLIER_ACTIVE = 2.0
URGENCY_MULTIPLIER_NORMAL = 1.0

TIME_BONUS = 3.0
TIME_BONUS_WINDOW_MIN = 30

ZONE_OVERLOAD_THRESHOLD = 0.85
ZONE_ADJUSTMENT = -1.0

WAIT_BONUS_PER_MIN = 0.1
WAIT_BONUS_CAP = 8.0


# -----------------------------
# SIMULATED ZONES
# -----------------------------
ZONES = {
    "Emergency Bay": {"capacity": 5, "occupied": 1},
    "VVIP Zone": {"capacity": 20, "occupied": 18},
    "Bus/Public Service Zone": {"capacity": 30, "occupied": 10},
    "General Zone A": {"capacity": 80, "occupied": 30},
    "General Zone B": {"capacity": 80, "occupied": 20},
}

PREFERRED_ZONE = {
    "Ambulance": "Emergency Bay",
    "VVIP": "VVIP Zone",
    "Bus": "Bus/Public Service Zone",
    "General": "General Zone A",
}

OVERFLOW_ZONE = {
    "Ambulance": "Emergency Bay",
    "VVIP": "Bus/Public Service Zone",
    "Bus": "General Zone A",
    "General": "General Zone B",
}


# -----------------------------
# VEHICLE MODEL
# -----------------------------
_id_counter = itertools.count(1)


@dataclass
class Vehicle:
    plate: str
    vehicle_type: str
    arrived_min_before_event: int
    waiting_min: int = 0
    id: int = field(default_factory=lambda: next(_id_counter))
    score: float = 0.0
    assigned_zone: str = ""
    score_breakdown: dict = field(default_factory=dict)


# -----------------------------
# APS FUNCTIONS
# -----------------------------
def calculate_priority_score(vehicle: Vehicle) -> dict:
    category_weight = CATEGORY_WEIGHTS[vehicle.vehicle_type]

    urgency_multiplier = (
        URGENCY_MULTIPLIER_ACTIVE
        if vehicle.vehicle_type == "Ambulance"
        else URGENCY_MULTIPLIER_NORMAL
    )

    base_score = category_weight * urgency_multiplier

    time_bonus = (
        TIME_BONUS
        if vehicle.arrived_min_before_event <= TIME_BONUS_WINDOW_MIN
        else 0.0
    )

    preferred_zone = PREFERRED_ZONE[vehicle.vehicle_type]
    zone = ZONES[preferred_zone]
    occupancy = zone["occupied"] / zone["capacity"]
    zone_overloaded = occupancy > ZONE_OVERLOAD_THRESHOLD

    zone_adjustment = (
        ZONE_ADJUSTMENT
        if zone_overloaded and vehicle.vehicle_type != "Ambulance"
        else 0.0
    )

    if vehicle.vehicle_type == "General":
        wait_bonus = min(vehicle.waiting_min * WAIT_BONUS_PER_MIN, WAIT_BONUS_CAP)
    else:
        wait_bonus = 0.0

    total_score = max(
        0.0,
        base_score + time_bonus + zone_adjustment + wait_bonus
    )

    return {
        "category_weight": category_weight,
        "urgency_multiplier": urgency_multiplier,
        "base_score": base_score,
        "time_bonus": time_bonus,
        "zone_occupancy": occupancy,
        "zone_overloaded": zone_overloaded,
        "zone_adjustment": zone_adjustment,
        "wait_bonus": wait_bonus,
        "total_score": total_score,
    }


def assign_zone(vehicle: Vehicle) -> str:
    preferred_zone = PREFERRED_ZONE[vehicle.vehicle_type]
    zone = ZONES[preferred_zone]
    occupancy = zone["occupied"] / zone["capacity"]

    if occupancy > ZONE_OVERLOAD_THRESHOLD and vehicle.vehicle_type != "Ambulance":
        return OVERFLOW_ZONE[vehicle.vehicle_type]

    return preferred_zone


def refresh_queue(queue: List[Vehicle]) -> None:
    for vehicle in queue:
        breakdown = calculate_priority_score(vehicle)
        vehicle.score = breakdown["total_score"]
        vehicle.assigned_zone = assign_zone(vehicle)
        vehicle.score_breakdown = breakdown

    queue.sort(key=lambda v: (-v.score, v.id))


# -----------------------------
# DISPLAY FUNCTIONS
# -----------------------------
def print_title(text: str) -> None:
    print("\n" + "=" * 90)
    print(text)
    print("=" * 90)


def print_queue(queue: List[Vehicle]) -> None:
    refresh_queue(queue)

    if not queue:
        print("\nNo vehicles in the queue yet.")
        return

    print("\nPRIORITY QUEUE — highest score appears on top")
    print("-" * 110)
    print(f"{'Rank':<6}{'ID':<5}{'Plate':<12}{'Type':<12}{'Wait':<9}{'Score':<9}{'Zone':<26}{'Reason'}")
    print("-" * 110)

    for rank, vehicle in enumerate(queue, start=1):
        bd = vehicle.score_breakdown

        reason = []

        if vehicle.vehicle_type == "Ambulance":
            reason.append("Emergency x2")

        if bd["time_bonus"] > 0:
            reason.append("+3 time")

        if bd["zone_adjustment"] < 0:
            reason.append("-1 zone full")

        if bd["wait_bonus"] > 0:
            reason.append(f"+{bd['wait_bonus']:.1f} wait")

        if rank == 1:
            reason.append("TOP")

        reason_text = ", ".join(reason)

        print(
            f"{rank:<6}{vehicle.id:<5}{vehicle.plate:<12}{vehicle.vehicle_type:<12}"
            f"{str(vehicle.waiting_min) + ' min':<9}{vehicle.score:<9.1f}"
            f"{vehicle.assigned_zone:<26}{reason_text}"
        )

    print("-" * 110)


def print_score_details(vehicle: Vehicle) -> None:
    bd = vehicle.score_breakdown

    print("\nScore breakdown")
    print("-" * 50)
    print(f"Vehicle              : {vehicle.plate} ({vehicle.vehicle_type})")
    print(f"Category weight      : {bd['category_weight']}")
    print(f"Urgency multiplier   : x{bd['urgency_multiplier']}")
    print(f"Base score           : {bd['base_score']}")
    print(f"Time bonus           : +{bd['time_bonus']}")
    print(f"Zone adjustment      : {bd['zone_adjustment']}")
    print(f"Waiting minutes      : {vehicle.waiting_min}")
    print(f"Wait bonus           : +{bd['wait_bonus']}")
    print(f"Final priority score : {bd['total_score']:.1f}")
    print(f"Assigned zone        : {vehicle.assigned_zone}")
    print("-" * 50)


# -----------------------------
# INPUT HELPERS
# -----------------------------
def read_int(prompt: str, default: Optional[int] = None, minimum: Optional[int] = None) -> int:
    while True:
        raw = input(prompt).strip()

        if raw == "" and default is not None:
            return default

        try:
            value = int(raw)

            if minimum is not None and value < minimum:
                print(f"Enter a number from {minimum} and above.")
                continue

            return value

        except ValueError:
            print("Enter a valid number.")


def choose_vehicle_type() -> str:
    choices = {
        "1": "Ambulance",
        "2": "VVIP",
        "3": "Bus",
        "4": "General",
    }

    print("\nChoose vehicle type")
    print("1. Ambulance")
    print("2. VVIP")
    print("3. Bus")
    print("4. General")

    while True:
        choice = input("Enter choice: ").strip()

        if choice in choices:
            return choices[choice]

        print("Invalid choice. Choose 1, 2, 3, or 4.")


def find_vehicle_by_id(queue: List[Vehicle], vehicle_id: int) -> Optional[Vehicle]:
    for vehicle in queue:
        if vehicle.id == vehicle_id:
            return vehicle

    return None


def find_next_general(queue: List[Vehicle]) -> Optional[Vehicle]:
    refresh_queue(queue)

    for vehicle in queue:
        if vehicle.vehicle_type == "General":
            return vehicle

    return None


def choose_wait_minutes() -> int:
    print("\nChoose waiting time to add")
    print("1. Add 3 minutes")
    print("2. Add 20 minutes")
    print("3. Add custom minutes")

    while True:
        choice = input("Enter choice: ").strip()

        if choice == "1":
            return 3

        if choice == "2":
            return 20

        if choice == "3":
            return read_int("Enter custom minutes: ", minimum=1)

        print("Invalid choice. Choose 1, 2, or 3.")


# -----------------------------
# MENU ACTIONS
# -----------------------------
def add_vehicle(queue: List[Vehicle]) -> None:
    vehicle_type = choose_vehicle_type()

    plate = input("Enter plate number, or press ENTER for auto plate: ").strip().upper()

    if not plate:
        plate = f"KDA {next(_id_counter) + 100}X"

    arrived_min = read_int(
        "Arrived how many minutes before event start? Press ENTER for 10: ",
        default=10,
        minimum=0
    )

    waiting_min = read_int(
        "Already waited how many minutes? Press ENTER for 0: ",
        default=0,
        minimum=0
    )

    vehicle = Vehicle(
        plate=plate,
        vehicle_type=vehicle_type,
        arrived_min_before_event=arrived_min,
        waiting_min=waiting_min,
    )

    queue.append(vehicle)
    refresh_queue(queue)

    print(f"\nAdded {vehicle.plate} as {vehicle.vehicle_type}. Queue re-sorted.")
    print_score_details(vehicle)
    print_queue(queue)


def add_wait_to_selected_vehicle(queue: List[Vehicle]) -> None:
    if not queue:
        print("\nNo vehicles available.")
        return

    refresh_queue(queue)
    print_queue(queue)

    print("\nChoose the vehicle to add waiting time to")
    print("1. Add time to the vehicle currently on top")
    print("2. Add time to the next General vehicle")
    print("3. Add time to a specific vehicle ID")

    target: Optional[Vehicle] = None

    while True:
        choice = input("Enter choice: ").strip()

        if choice == "1":
            target = queue[0]
            break

        if choice == "2":
            target = find_next_general(queue)

            if target is None:
                print("There is no General vehicle in the queue.")
                return

            break

        if choice == "3":
            vehicle_id = read_int("Enter vehicle ID: ", minimum=1)
            target = find_vehicle_by_id(queue, vehicle_id)

            if target is None:
                print("No vehicle found with that ID.")
                return

            break

        print("Invalid choice. Choose 1, 2, or 3.")

    minutes = choose_wait_minutes()
    target.waiting_min += minutes
    refresh_queue(queue)

    print(f"\nAdded {minutes} waiting minutes to {target.plate} ({target.vehicle_type}).")

    if target.vehicle_type != "General":
        print("Note: Under the APS formula, waiting bonus affects General vehicles only.")
        print("The waiting minutes are recorded, but the priority score may not increase.")

    print_score_details(target)
    print_queue(queue)


def simulate_three_minutes_for_all(queue: List[Vehicle]) -> None:
    if not queue:
        print("\nNo vehicles available.")
        return

    for vehicle in queue:
        vehicle.waiting_min += 3

    refresh_queue(queue)

    print("\n3 minutes have passed for all vehicles still waiting.")
    print("General vehicles receive +0.3 score because wait bonus is +0.1 per minute.")
    print_queue(queue)


def process_top_vehicle(queue: List[Vehicle]) -> None:
    if not queue:
        print("\nNo vehicles available.")
        return

    refresh_queue(queue)
    vehicle = queue.pop(0)

    if vehicle.assigned_zone in ZONES:
        ZONES[vehicle.assigned_zone]["occupied"] += 1

    print("\nNext vehicle allocated/processed")
    print("-" * 50)
    print(f"Plate         : {vehicle.plate}")
    print(f"Type          : {vehicle.vehicle_type}")
    print(f"Score         : {vehicle.score:.1f}")
    print(f"Assigned zone : {vehicle.assigned_zone}")
    print("-" * 50)

    print_queue(queue)


# -----------------------------
# SAMPLE QUEUE
# -----------------------------
def load_sample_queue() -> List[Vehicle]:
    queue = [
        Vehicle("KCA 101G", "General", arrived_min_before_event=25, waiting_min=0),
        Vehicle("KCB 202G", "General", arrived_min_before_event=20, waiting_min=8),
        Vehicle("KDB 303B", "Bus", arrived_min_before_event=15, waiting_min=0),
        Vehicle("KDG 007V", "VVIP", arrived_min_before_event=10, waiting_min=0),
    ]

    refresh_queue(queue)

    return queue


# -----------------------------
# MAIN PROGRAM
# -----------------------------
def main() -> None:
    queue = load_sample_queue()

    print_title("INTERACTIVE APS PARKING PRIORITY DEMO")
    print("This demo lets you input Ambulance, VVIP, Bus, or General vehicles.")
    print("The system calculates the APS score and places the highest priority vehicle on top.")
    print("Bus is treated as Public Service. Ambulance is treated as Emergency.")

    while True:
        print("\nMENU")
        print("1. Show priority queue")
        print("2. Add a new vehicle")
        print("3. Add waiting time to top / next General / selected vehicle")
        print("4. Simulate 3 minutes passing for all waiting vehicles")
        print("5. Process/allocate the top vehicle")
        print("0. Exit")

        choice = input("Choose an option: ").strip()

        if choice == "1":
            print_queue(queue)

        elif choice == "2":
            add_vehicle(queue)

        elif choice == "3":
            add_wait_to_selected_vehicle(queue)

        elif choice == "4":
            simulate_three_minutes_for_all(queue)

        elif choice == "5":
            process_top_vehicle(queue)

        elif choice == "0":
            print("\nDemo ended.")
            break

        else:
            print("Invalid option. Choose 0, 1, 2, 3, 4, or 5.")


if __name__ == "__main__":
    main()
