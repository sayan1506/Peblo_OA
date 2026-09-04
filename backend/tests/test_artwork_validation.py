from io import BytesIO

import pytest
from PIL import Image

from app.services.artwork_validation import ArtworkValidationError, validate_artwork


def _jpeg_bytes(width: int, height: int) -> bytes:
    buf = BytesIO()
    Image.new("RGB", (width, height), color=(100, 150, 200)).save(buf, format="JPEG")
    return buf.getvalue()


def test_banner_happy_path():
    # No banner_good.jpg exists in seed_data/assets, so the happy path is
    # exercised here with an in-memory image instead of an end-to-end upload test.
    data = _jpeg_bytes(1280, 720)
    width, height = validate_artwork("banner", data)
    assert (width, height) == (1280, 720)


def test_poster_happy_path():
    data = _jpeg_bytes(600, 900)
    assert validate_artwork("poster", data) == (600, 900)


def test_thumbnail_happy_path():
    data = _jpeg_bytes(640, 360)
    assert validate_artwork("thumbnail", data) == (640, 360)


def test_rejects_wrong_aspect_ratio():
    data = _jpeg_bytes(900, 600)  # swapped poster ratio
    with pytest.raises(ArtworkValidationError, match="2:3"):
        validate_artwork("poster", data)


def test_rejects_undersized_dimensions():
    data = _jpeg_bytes(160, 90)  # correct 16:9 aspect, far below target
    with pytest.raises(ArtworkValidationError, match="640x360"):
        validate_artwork("thumbnail", data)


def test_rejects_oversized_dimensions_even_when_small_file():
    data = _jpeg_bytes(2560, 1440)  # correct aspect, 2x target px, small file size
    with pytest.raises(ArtworkValidationError, match="1280x720"):
        validate_artwork("banner", data)


def test_rejects_file_over_size_ceiling():
    # A large, noisy image compresses poorly, easily exceeding 200 KB.
    buf = BytesIO()
    Image.effect_noise((1280, 720), 50).convert("RGB").save(buf, format="JPEG", quality=95)
    data = buf.getvalue()
    assert len(data) > 200 * 1024
    with pytest.raises(ArtworkValidationError, match="KB"):
        validate_artwork("banner", data)


def test_rejects_unreadable_file():
    with pytest.raises(ArtworkValidationError, match="readable image"):
        validate_artwork("poster", b"not an image")


def test_rejects_unknown_kind():
    with pytest.raises(ArtworkValidationError, match="Unknown artwork type"):
        validate_artwork("icon", _jpeg_bytes(600, 900))
