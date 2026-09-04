from fastapi import FastAPI

from app.routers import auth, episodes, health, seasons, shows

app = FastAPI(title="Peblo TV Mini API")

app.include_router(auth.router)
app.include_router(shows.router)
app.include_router(seasons.router)
app.include_router(episodes.router)
app.include_router(health.router)
