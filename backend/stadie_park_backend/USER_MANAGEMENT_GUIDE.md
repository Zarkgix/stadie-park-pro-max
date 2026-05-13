# User Management Guide

## Backend Running ✅
Your backend is now running on **http://localhost:8000**

---

## 📊 Understanding Users in Your System

Your backend has two types of users:

| User Type | is_admin | Purpose | Permissions |
|-----------|----------|---------|-------------|
| **Admin** | `true` | Manage the parking system | Full access to all features |
| **Normal User** | `false` | Regular parking user | Can register vehicles, view queue |

---

## 🔧 User Management Methods

### Method 1: Frontend Registration Page (Easy)
**Location:** http://localhost:8080/user-register

1. Go to the registration page
2. Choose account type: **Admin** or **Normal User**
3. Enter email and password
4. Click "Create account"
5. Log in with credentials

**Limitations:** Anyone can create an admin account (use Method 2 for production security)

---

### Method 2: Database Direct Access (Advanced)

Your database file is at:
```
c:\Users\STEPLA\Desktop\frontend\backend\stadie_park_backend\stadie_park.db
```

**Using SQLite Browser:**
1. Download [DB Browser for SQLite](https://sqlitebrowser.org/)
2. Open `stadie_park.db`
3. Go to **Browse Data** tab
4. Select **users** table
5. You can view/edit users directly

**To see current users:**
```sql
SELECT id, email, is_admin, is_active FROM users;
```

**To change a user from Normal to Admin:**
```sql
UPDATE users SET is_admin = 1 WHERE email = 'user@example.com';
```

**To deactivate a user:**
```sql
UPDATE users SET is_active = 0 WHERE email = 'user@example.com';
```

---

### Method 3: Python CLI Script (Recommended for Backend)

Create a script to manage users. Save this as `manage_users.py` in your backend folder:

```python
"""
User management script for Stadie-Park backend
Run from: python manage_users.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy.orm import Session
from app.database import SessionLocal, engine, Base
from app.models.user import User
from app.auth import get_password_hash
from sqlalchemy import create_engine

def create_user(email: str, password: str, is_admin: bool = False):
    """Create a new user"""
    db = SessionLocal()
    
    # Check if user exists
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        print(f"❌ User {email} already exists")
        return
    
    hashed_password = get_password_hash(password)
    new_user = User(
        email=email,
        hashed_password=hashed_password,
        is_admin=is_admin,
        is_active=True
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    user_type = "Admin" if is_admin else "Normal User"
    print(f"✅ Created {user_type}: {email}")
    db.close()

def list_users():
    """List all users"""
    db = SessionLocal()
    users = db.query(User).all()
    
    if not users:
        print("No users found")
        return
    
    print("\n" + "="*60)
    print(f"{'ID':<5} {'Email':<25} {'Type':<15} {'Active':<10}")
    print("="*60)
    
    for user in users:
        user_type = "Admin" if user.is_admin else "Normal User"
        status = "✓" if user.is_active else "✗"
        print(f"{user.id:<5} {user.email:<25} {user_type:<15} {status:<10}")
    
    print("="*60 + "\n")
    db.close()

def promote_to_admin(email: str):
    """Make a user an admin"""
    db = SessionLocal()
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        print(f"❌ User {email} not found")
        return
    
    if user.is_admin:
        print(f"ℹ️  {email} is already an admin")
        return
    
    user.is_admin = True
    db.commit()
    print(f"✅ Promoted {email} to Admin")
    db.close()

def demote_to_user(email: str):
    """Make an admin a regular user"""
    db = SessionLocal()
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        print(f"❌ User {email} not found")
        return
    
    if not user.is_admin:
        print(f"ℹ️  {email} is already a normal user")
        return
    
    user.is_admin = False
    db.commit()
    print(f"✅ Demoted {email} to Normal User")
    db.close()

def deactivate_user(email: str):
    """Deactivate a user"""
    db = SessionLocal()
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        print(f"❌ User {email} not found")
        return
    
    user.is_active = False
    db.commit()
    print(f"✅ Deactivated {email}")
    db.close()

def delete_user(email: str):
    """Delete a user"""
    db = SessionLocal()
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        print(f"❌ User {email} not found")
        return
    
    db.delete(user)
    db.commit()
    print(f"✅ Deleted {email}")
    db.close()

if __name__ == "__main__":
    print("Stadie-Park User Management")
    print("-" * 40)
    
    if len(sys.argv) < 2:
        print("\nUsage:")
        print("  python manage_users.py list                              # List all users")
        print("  python manage_users.py create <email> <password>         # Create user")
        print("  python manage_users.py create-admin <email> <password>   # Create admin")
        print("  python manage_users.py promote <email>                   # Make user admin")
        print("  python manage_users.py demote <email>                    # Make admin user")
        print("  python manage_users.py deactivate <email>                # Deactivate user")
        print("  python manage_users.py delete <email>                    # Delete user")
        sys.exit(0)
    
    command = sys.argv[1]
    
    if command == "list":
        list_users()
    elif command == "create":
        if len(sys.argv) < 4:
            print("Usage: python manage_users.py create <email> <password>")
            sys.exit(1)
        create_user(sys.argv[2], sys.argv[3], is_admin=False)
    elif command == "create-admin":
        if len(sys.argv) < 4:
            print("Usage: python manage_users.py create-admin <email> <password>")
            sys.exit(1)
        create_user(sys.argv[2], sys.argv[3], is_admin=True)
    elif command == "promote":
        if len(sys.argv) < 3:
            print("Usage: python manage_users.py promote <email>")
            sys.exit(1)
        promote_to_admin(sys.argv[2])
    elif command == "demote":
        if len(sys.argv) < 3:
            print("Usage: python manage_users.py demote <email>")
            sys.exit(1)
        demote_to_user(sys.argv[2])
    elif command == "deactivate":
        if len(sys.argv) < 3:
            print("Usage: python manage_users.py deactivate <email>")
            sys.exit(1)
        deactivate_user(sys.argv[2])
    elif command == "delete":
        if len(sys.argv) < 3:
            print("Usage: python manage_users.py delete <email>")
            sys.exit(1)
        delete_user(sys.argv[2])
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)
```

**How to use it:**

1. Save the script as `manage_users.py` in your backend folder
2. In a new terminal, activate your virtual environment:
```bash
cd /c/Users/STEPLA/Desktop/frontend/backend/stadie_park_backend
source venv/Scripts/activate
```

3. Use the commands:
```bash
# List all users
python manage_users.py list

# Create a normal user
python manage_users.py create john@example.com password123

# Create an admin user
python manage_users.py create-admin admin@example.com adminpass123

# Promote a user to admin
python manage_users.py promote john@example.com

# Demote an admin to normal user
python manage_users.py demote admin@example.com

# Deactivate a user (they can't login)
python manage_users.py deactivate john@example.com

# Delete a user
python manage_users.py delete john@example.com
```

---

## 🔍 Checking Users via API

### Get All Users (Admin Only)
You can add this endpoint to your backend to get user info:

```python
# Add to app/routers/auth.py
@router.get("/users", response_model=list[UserResponse])
async def get_all_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),  # Must be logged in
):
    """Get all users (admin only)"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    return db.query(User).all()
```

### Check Who You're Logged In As

Add this to your frontend's `src/lib/apiClient.ts`:

```typescript
/**
 * Decode JWT token to get user info
 * Install jwt-decode first: npm install jwt-decode
 */
export function getCurrentUserFromToken(): { email: string; is_admin: boolean } | null {
  const token = getToken();
  if (!token) return null;
  
  try {
    // Decode without verification (for frontend display only)
    const parts = token.split('.');
    const decoded = JSON.parse(atob(parts[1]));
    return {
      email: decoded.sub || decoded.email,
      is_admin: decoded.is_admin || false,
    };
  } catch {
    return null;
  }
}
```

---

## 📱 Frontend Integration Example

Create a user info display component:

```typescript
// src/components/UserInfo.tsx
import { getToken, removeToken } from '@/lib/apiClient';
import { useNavigate } from '@tanstack/react-router';
import { useState, useEffect } from 'react';

export function UserInfo() {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    try {
      const parts = token.split('.');
      const decoded = JSON.parse(atob(parts[1]));
      setUserEmail(decoded.sub);
    } catch {
      console.error('Failed to decode token');
    }
  }, []);

  if (!userEmail) return null;

  const handleLogout = async () => {
    removeToken();
    await navigate({ to: '/login' });
  };

  return (
    <div className="flex items-center gap-4 text-white">
      <span className="text-sm">{userEmail}</span>
      <button
        onClick={handleLogout}
        className="text-xs text-white/70 hover:text-white"
      >
        logout
      </button>
    </div>
  );
}
```

---

## 🚀 Quick Start Example

### Create test users quickly:

**Via frontend (http://localhost:8080/user-register):**
1. Create user: `admin@test.com` / `password123` with Admin selected
2. Create user: `user@test.com` / `password123` with Normal User selected

**Via Python script (if you created manage_users.py):**
```bash
python manage_users.py create-admin admin@test.com password123
python manage_users.py create user@test.com password123
python manage_users.py list
```

---

## 📝 Database Schema

Your users table has these fields:
```
id (Integer) - Primary key
email (String) - User's email (unique)
hashed_password (String) - Encrypted password
is_admin (Boolean) - Admin flag (true/false)
is_active (Boolean) - Active status (true/false)
```

---

## ⚡ Quick Reference

| What | How |
|------|-----|
| **Create user** | Frontend: `/user-register` or Python: `manage_users.py create` |
| **View users** | Python: `manage_users.py list` or DB Browser |
| **Make admin** | Python: `manage_users.py promote email@test.com` |
| **Deactivate** | Python: `manage_users.py deactivate email@test.com` |
| **Delete user** | Python: `manage_users.py delete email@test.com` |
| **Check database** | Open `stadie_park.db` with DB Browser for SQLite |

---

## 🔐 Security Notes

- Passwords are hashed using bcrypt (secure)
- Tokens expire (check your `auth.py` for timeout settings)
- Never share tokens or passwords
- Protect admin account carefully
- In production, use stronger password requirements
- Consider email verification before account activation

