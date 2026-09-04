from fastapi import FastAPI

from app.routers import auth, health

app = FastAPI(title="Peblo TV Mini API")

app.include_router(auth.router)
app.include_router(health.router)
