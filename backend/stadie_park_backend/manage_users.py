#!/usr/bin/env python3
"""
User management script for Stadie-Park backend
Run from backend directory: python manage_users.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.user import User
# Import Vehicle to ensure relationships are properly initialized
from app.models.vehicle import Vehicle
from app.models.parking_slot import ParkingSlot
from app.models.payment import Payment
from app.auth import get_password_hash

def create_user(email: str, password: str, is_admin: bool = False):
    """Create a new user"""
    db = SessionLocal()
    
    try:
        # Check if user exists
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            print(f"❌ User {email} already exists")
            return False
        
        hashed_password = get_password_hash(password)
        new_user = User(
            email=email,
            hashed_password=hashed_password,
            is_admin=is_admin,
            is_active=True
        )
        
        db.add(new_user)
        db.commit()
        
        user_type = "Admin" if is_admin else "Normal User"
        print(f"✅ Created {user_type}: {email}")
        return True
    except Exception as e:
        print(f"❌ Error creating user: {str(e)}")
        return False
    finally:
        db.close()

def list_users():
    """List all users"""
    db = SessionLocal()
    
    try:
        users = db.query(User).all()
        
        if not users:
            print("No users found")
            return
        
        print("\n" + "="*70)
        print(f"{'ID':<5} {'Email':<30} {'Type':<15} {'Active':<10}")
        print("="*70)
        
        for user in users:
            user_type = "Admin" if user.is_admin else "Normal User"
            status = "✓ Yes" if user.is_active else "✗ No"
            print(f"{user.id:<5} {user.email:<30} {user_type:<15} {status:<10}")
        
        print("="*70 + "\n")
    except Exception as e:
        print(f"❌ Error listing users: {str(e)}")
    finally:
        db.close()

def promote_to_admin(email: str):
    """Make a user an admin"""
    db = SessionLocal()
    
    try:
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            print(f"❌ User {email} not found")
            return False
        
        if user.is_admin:
            print(f"ℹ️  {email} is already an admin")
            return True
        
        user.is_admin = True
        db.commit()
        print(f"✅ Promoted {email} to Admin")
        return True
    except Exception as e:
        print(f"❌ Error promoting user: {str(e)}")
        return False
    finally:
        db.close()

def demote_to_user(email: str):
    """Make an admin a regular user"""
    db = SessionLocal()
    
    try:
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            print(f"❌ User {email} not found")
            return False
        
        if not user.is_admin:
            print(f"ℹ️  {email} is already a normal user")
            return True
        
        user.is_admin = False
        db.commit()
        print(f"✅ Demoted {email} to Normal User")
        return True
    except Exception as e:
        print(f"❌ Error demoting user: {str(e)}")
        return False
    finally:
        db.close()

def deactivate_user(email: str):
    """Deactivate a user (they can't login)"""
    db = SessionLocal()
    
    try:
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            print(f"❌ User {email} not found")
            return False
        
        if not user.is_active:
            print(f"ℹ️  {email} is already deactivated")
            return True
        
        user.is_active = False
        db.commit()
        print(f"✅ Deactivated {email}")
        return True
    except Exception as e:
        print(f"❌ Error deactivating user: {str(e)}")
        return False
    finally:
        db.close()

def activate_user(email: str):
    """Activate a deactivated user"""
    db = SessionLocal()
    
    try:
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            print(f"❌ User {email} not found")
            return False
        
        if user.is_active:
            print(f"ℹ️  {email} is already active")
            return True
        
        user.is_active = True
        db.commit()
        print(f"✅ Activated {email}")
        return True
    except Exception as e:
        print(f"❌ Error activating user: {str(e)}")
        return False
    finally:
        db.close()

def delete_user(email: str):
    """Delete a user permanently"""
    db = SessionLocal()
    
    try:
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            print(f"❌ User {email} not found")
            return False
        
        db.delete(user)
        db.commit()
        print(f"✅ Deleted {email}")
        return True
    except Exception as e:
        print(f"❌ Error deleting user: {str(e)}")
        return False
    finally:
        db.close()

def main():
    """Main entry point"""
    print("\n" + "="*70)
    print("Stadie-Park User Management")
    print("="*70 + "\n")
    
    if len(sys.argv) < 2:
        print("📖 Usage:\n")
        print("  List all users:")
        print("    python manage_users.py list\n")
        
        print("  Create a normal user:")
        print("    python manage_users.py create <email> <password>\n")
        
        print("  Create an admin user:")
        print("    python manage_users.py create-admin <email> <password>\n")
        
        print("  Promote user to admin:")
        print("    python manage_users.py promote <email>\n")
        
        print("  Demote admin to normal user:")
        print("    python manage_users.py demote <email>\n")
        
        print("  Deactivate a user (can't login):")
        print("    python manage_users.py deactivate <email>\n")
        
        print("  Activate a deactivated user:")
        print("    python manage_users.py activate <email>\n")
        
        print("  Delete a user:")
        print("    python manage_users.py delete <email>\n")
        
        print("="*70 + "\n")
        sys.exit(0)
    
    command = sys.argv[1].lower()
    
    if command == "list":
        list_users()
    elif command == "create":
        if len(sys.argv) < 4:
            print("❌ Usage: python manage_users.py create <email> <password>")
            sys.exit(1)
        create_user(sys.argv[2], sys.argv[3], is_admin=False)
    elif command == "create-admin":
        if len(sys.argv) < 4:
            print("❌ Usage: python manage_users.py create-admin <email> <password>")
            sys.exit(1)
        create_user(sys.argv[2], sys.argv[3], is_admin=True)
    elif command == "promote":
        if len(sys.argv) < 3:
            print("❌ Usage: python manage_users.py promote <email>")
            sys.exit(1)
        promote_to_admin(sys.argv[2])
    elif command == "demote":
        if len(sys.argv) < 3:
            print("❌ Usage: python manage_users.py demote <email>")
            sys.exit(1)
        demote_to_user(sys.argv[2])
    elif command == "deactivate":
        if len(sys.argv) < 3:
            print("❌ Usage: python manage_users.py deactivate <email>")
            sys.exit(1)
        deactivate_user(sys.argv[2])
    elif command == "activate":
        if len(sys.argv) < 3:
            print("❌ Usage: python manage_users.py activate <email>")
            sys.exit(1)
        activate_user(sys.argv[2])
    elif command == "delete":
        if len(sys.argv) < 3:
            print("❌ Usage: python manage_users.py delete <email>")
            sys.exit(1)
        confirm = input(f"⚠️  Are you sure you want to delete {sys.argv[2]}? (yes/no): ")
        if confirm.lower() == "yes":
            delete_user(sys.argv[2])
        else:
            print("Cancelled")
    elif command == "help":
        print("Run without arguments for help")
    else:
        print(f"❌ Unknown command: {command}")
        print("Run without arguments to see available commands")
        sys.exit(1)

if __name__ == "__main__":
    main()
