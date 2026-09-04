from app.config import settings
from app.storage.local import LocalStorage


def get_storage():
    if settings.storage_backend == "local":
        return LocalStorage(settings.storage_local_path)
    raise ValueError(f"Unknown storage backend: {settings.storage_backend}")
