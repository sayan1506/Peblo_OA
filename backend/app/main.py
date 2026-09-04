from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.routers import artwork, auth, episodes, health, seasons, shows

Path(settings.storage_local_path).mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Peblo TV Mini API")

app.include_router(auth.router)
app.include_router(shows.router)
app.include_router(seasons.router)
app.include_router(episodes.router)
app.include_router(artwork.router)
app.include_router(health.router)

app.mount("/static", StaticFiles(directory=settings.storage_local_path), name="static")
