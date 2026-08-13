#!/usr/bin/env python3
"""Build normalized 400 px reference and binary-mask sprite sheets."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "character-turnaround-reference-v1.png"
REFERENCE_OUT = ROOT / "assets" / "slicer-reference-v1.png"
MASK_OUT = ROOT / "assets" / "slicer-masks-v1.png"
META_OUT = ROOT / "assets" / "slicer-reference-v1.json"

CELL_WIDTH = 256
CELL_HEIGHT = 440
TARGET_HEIGHT = 400
CROWN_Y = 20

VIEWS = (
    ("front", 0, 10, 158),
    ("frontThree", 45, 158, 328),
    ("side", 90, 328, 458),
    ("rearThree", 135, 458, 618),
    ("back", 180, 618, 782),
)


def extract_subject(rgb: np.ndarray) -> np.ndarray:
    """Separate the colored/dark figure from the warm neutral grid."""
    maximum = rgb.max(axis=2)
    minimum = rgb.min(axis=2)
    mean = rgb.mean(axis=2)
    seed = ((maximum - minimum) > 14) | (mean < 178)
    seed = ndimage.binary_closing(seed, iterations=1)
    labels, count = ndimage.label(seed)
    if count == 0:
        raise RuntimeError("No foreground component found")
    sizes = np.bincount(labels.ravel())
    sizes[0] = 0
    subject = labels == int(np.argmax(sizes))
    subject = ndimage.binary_fill_holes(subject)
    return subject


def main() -> None:
    source = Image.open(SOURCE).convert("RGB")
    pixels = np.asarray(source)
    reference_sheet = Image.new("RGBA", (CELL_WIDTH * len(VIEWS), CELL_HEIGHT))
    mask_sheet = Image.new("L", reference_sheet.size)
    metadata: dict[str, object] = {
        "version": "1.0.0",
        "source": SOURCE.name,
        "cellWidth": CELL_WIDTH,
        "cellHeight": CELL_HEIGHT,
        "targetHeight": TARGET_HEIGHT,
        "crownY": CROWN_Y,
        "floorY": CROWN_Y + TARGET_HEIGHT,
        "views": [],
    }

    for index, (name, angle, crop_left, crop_right) in enumerate(VIEWS):
        crop_pixels = pixels[:, crop_left:crop_right]
        subject = extract_subject(crop_pixels)
        yy, xx = np.where(subject)
        left, top, right, bottom = xx.min(), yy.min(), xx.max(), yy.max()

        color_crop = source.crop(
            (crop_left + left, top, crop_left + right + 1, bottom + 1)
        )
        mask_crop = Image.fromarray(
            (subject[top : bottom + 1, left : right + 1] * 255).astype(np.uint8),
            mode="L",
        )
        scale = TARGET_HEIGHT / color_crop.height
        width = max(1, round(color_crop.width * scale))
        size = (width, TARGET_HEIGHT)
        color_crop = color_crop.resize(size, Image.Resampling.LANCZOS)
        mask_crop = mask_crop.resize(size, Image.Resampling.NEAREST)
        alpha = mask_crop.point(lambda value: 255 if value >= 128 else 0)
        color_crop.putalpha(alpha)

        target_x = index * CELL_WIDTH + (CELL_WIDTH - width) // 2
        reference_sheet.alpha_composite(color_crop, (target_x, CROWN_Y))
        mask_sheet.paste(alpha, (target_x, CROWN_Y))

        metadata["views"].append(
            {
                "key": name,
                "angle": angle,
                "sourceBounds": [
                    int(crop_left + left),
                    int(top),
                    int(crop_left + right),
                    int(bottom),
                ],
                "normalizedBounds": [
                    int(target_x - index * CELL_WIDTH),
                    CROWN_Y,
                    int(target_x - index * CELL_WIDTH + width),
                    CROWN_Y + TARGET_HEIGHT,
                ],
            }
        )

    reference_sheet.save(REFERENCE_OUT, optimize=True)
    mask_sheet.save(MASK_OUT, optimize=True)
    META_OUT.write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(metadata, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
