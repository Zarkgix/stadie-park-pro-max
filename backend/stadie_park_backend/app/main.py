"""Main FastAPI application entrypoint for Stadie-Park backend."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from sqlalchemy import inspect, text

from .database import engine, Base
from .routers import ai, auth, vehicles, payments, queue
# Import all models to register them with Base
from .models import user, vehicle, payment, parking_slot

load_dotenv()

app = FastAPI(
    title="Stadie-Park Backend",
    description="FastAPI backend for the Stadie-Park smart parking and priority parking system.",
    version="0.1.0",
)

origins = [
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8081",
    "http://127.0.0.1:8081",
    "http://localhost:8082",
    "http://127.0.0.1:8082",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create database tables on startup.
Base.metadata.create_all(bind=engine)

def ensure_user_type_column():
    """Backfill older SQLite databases that predate role-based accounts."""
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return
    columns = {column["name"] for column in inspector.get_columns("users")}
    if "user_type" in columns:
        return

    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE users ADD COLUMN user_type VARCHAR"))
        connection.execute(
            text(
                "UPDATE users "
                "SET user_type = CASE WHEN is_admin = 1 THEN 'admin' ELSE 'driver' END "
                "WHERE user_type IS NULL"
            )
        )

ensure_user_type_column()

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(ai.router, prefix="/ai", tags=["ai"])
app.include_router(vehicles.router, prefix="/vehicles", tags=["vehicles"])
app.include_router(payments.router, prefix="/payments", tags=["payments"])
app.include_router(queue.router, prefix="/queue", tags=["queue"])

@app.get("/health")
async def health_check():
    """Health check endpoint for quick monitoring."""
    return {"status": "ok", "service": "stadie-park-backend"}

# Run the server locally with: uvicorn app.main:app --reload
# API docs are available automatically at /docs and /redoc.
