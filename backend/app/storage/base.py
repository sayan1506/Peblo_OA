from abc import ABC, abstractmethod


class Storage(ABC):
    @abstractmethod
    def put(self, key: str, data: bytes, content_type: str) -> str:
        """Writes data under key, returns a URL/path the app can serve."""

    @abstractmethod
    def get(self, key: str) -> bytes:
        """Reads back the bytes stored under key. Raises FileNotFoundError if absent."""

    @abstractmethod
    def delete(self, key: str) -> None:
        ...
