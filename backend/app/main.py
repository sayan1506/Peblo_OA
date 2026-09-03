from fastapi import FastAPI

from app.routers import health

app = FastAPI(title="Peblo TV Mini API")

app.include_router(health.router)
