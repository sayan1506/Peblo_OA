from io import BytesIO

from PIL import Image

SPECS = {
    "poster": {"aspect": (2, 3), "target_px": (600, 900)},
    "banner": {"aspect": (16, 9), "target_px": (1280, 720)},
    "thumbnail": {"aspect": (16, 9), "target_px": (640, 360)},
}
MAX_BYTES = 200 * 1024
ASPECT_TOLERANCE = 0.02  # 2% — catches swapped ratios, not rounding noise
DIMENSION_TOLERANCE = 0.15  # 15% either side of target_px


class ArtworkValidationError(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


def validate_artwork(kind: str, data: bytes) -> tuple[int, int]:
    if kind not in SPECS:
        raise ArtworkValidationError(f"Unknown artwork type '{kind}'.")

    if len(data) > MAX_BYTES:
        kb = len(data) / 1024
        raise ArtworkValidationError(
            f"This {kind} image is {kb:.0f} KB, which is over the 200 KB limit. "
            "Try re-saving it at a lower quality or smaller size."
        )

    try:
        img = Image.open(BytesIO(data))
        width, height = img.size
    except Exception:
        raise ArtworkValidationError("This file isn't a readable image. Try a plain JPG or PNG.")

    spec = SPECS[kind]
    expected_ratio = spec["aspect"][0] / spec["aspect"][1]
    actual_ratio = width / height
    if abs(actual_ratio - expected_ratio) / expected_ratio > ASPECT_TOLERANCE:
        a, b = spec["aspect"]
        raise ArtworkValidationError(
            f"This {kind} image is {width}x{height}, which isn't a {a}:{b} shape. "
            f"Crop it to {a}:{b} and try again."
        )

    target_w, target_h = spec["target_px"]
    if (
        abs(width - target_w) / target_w > DIMENSION_TOLERANCE
        or abs(height - target_h) / target_h > DIMENSION_TOLERANCE
    ):
        raise ArtworkValidationError(
            f"This {kind} image is {width}x{height}. We're expecting close to "
            f"{target_w}x{target_h}. Resize it and try again."
        )

    return width, height
