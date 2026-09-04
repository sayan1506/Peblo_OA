import os
import tempfile
from pathlib import Path

from app.storage.base import Storage


class LocalStorage(Storage):
    def __init__(self, base_path: str):
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)

    def put(self, key: str, data: bytes, content_type: str) -> str:
        path = self.base_path / key
        path.parent.mkdir(parents=True, exist_ok=True)

        fd, tmp_path = tempfile.mkstemp(dir=path.parent)
        try:
            with os.fdopen(fd, "wb") as f:
                f.write(data)
            os.replace(tmp_path, path)  # atomic rename, same filesystem
        except Exception:
            os.unlink(tmp_path)
            raise

        return f"/static/{key}"

    def delete(self, key: str) -> None:
        path = self.base_path / key
        path.unlink(missing_ok=True)
