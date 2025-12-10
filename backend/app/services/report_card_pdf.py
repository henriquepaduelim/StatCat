from __future__ import annotations

import base64
import logging
from pathlib import Path
from typing import Optional
import xml.etree.ElementTree as ET

from app.core.config import settings
from app.models.athlete import Athlete
from app.models.report_submission import ReportSubmission

logger = logging.getLogger(__name__)

SVG_NS = "http://www.w3.org/2000/svg"
XLINK_NS = "http://www.w3.org/1999/xlink"
ET.register_namespace("", SVG_NS)
ET.register_namespace("xlink", XLINK_NS)


def _resolve_media_path(photo_url: str | None) -> Optional[Path]:
    if not photo_url:
        return None
    candidate = Path(photo_url)
    if candidate.is_absolute():
        return candidate if candidate.exists() else None

    clean = photo_url.lstrip("/")
    if clean.startswith("media/"):
        clean = clean[len("media/") :]

    media_root = Path(settings.MEDIA_ROOT)
    candidate = media_root / clean
    if candidate.exists():
        return candidate
    return None


def _inject_photo(svg_content: str, photo_bytes: bytes) -> str:
    root = ET.fromstring(svg_content)

    defs = root.find(f"{{{SVG_NS}}}defs")
    if defs is None:
        defs = ET.SubElement(root, f"{{{SVG_NS}}}defs")

    clip_id = "report_photo_clip"
    existing_clip = defs.find(f".//{{{SVG_NS}}}clipPath[@id='{clip_id}']")
    if existing_clip is None:
        clip = ET.SubElement(defs, f"{{{SVG_NS}}}clipPath", {"id": clip_id})
        ET.SubElement(
            clip,
            f"{{{SVG_NS}}}circle",
            {
                "cx": "151.5",
                "cy": "205.5",
                "r": "36.5",
            },
        )

    image_attrib = {
        "x": "115",
        "y": "169",
        "width": "73",
        "height": "73",
        "clip-path": f"url(#{clip_id})",
        "preserveAspectRatio": "xMidYMid slice",
        f"{{{XLINK_NS}}}href": f"data:image/jpeg;base64,{base64.b64encode(photo_bytes).decode()}",
    }
    ET.SubElement(root, f"{{{SVG_NS}}}image", image_attrib)

    return ET.tostring(root, encoding="unicode")


def generate_report_card_pdf(
    submission: ReportSubmission,
    athlete: Athlete | None,
) -> Optional[Path]:
    """
    Render a report card PDF from the base SVG template.

    Returns a Path to the generated PDF or None if rendering failed.
    """
    try:
        import cairosvg  # type: ignore
    except Exception as exc:  # pragma: no cover - runtime dependency guard
        logger.error("CairoSVG not available for PDF rendering: %s", exc)
        return None

    base_dir = Path(__file__).resolve().parents[2]  # backend/ directory
    template_path = base_dir / settings.REPORT_CARD_TEMPLATE_DIR / settings.REPORT_CARD_TEMPLATE_FILE
    if not template_path.exists():
        logger.error("Report card template not found at %s", template_path)
        return None

    output_dir = base_dir / settings.REPORT_CARD_OUTPUT_DIR
    output_dir.mkdir(parents=True, exist_ok=True)

    photo_bytes: bytes | None = None
    if athlete and athlete.photo_url:
        photo_path = _resolve_media_path(athlete.photo_url)
        if photo_path and photo_path.exists():
            try:
                photo_bytes = photo_path.read_bytes()
            except OSError as exc:
                logger.warning("Failed to read athlete photo at %s: %s", photo_path, exc)

    svg_content = template_path.read_text(encoding="utf-8")
    if photo_bytes:
        svg_content = _inject_photo(svg_content, photo_bytes)

    output_path = output_dir / f"report_card_{submission.id}.pdf"
    try:
        cairosvg.svg2pdf(bytestring=svg_content.encode("utf-8"), write_to=str(output_path))
        try:
            return output_path.relative_to(base_dir)
        except ValueError:
            return output_path
    except Exception as exc:
        logger.error("Failed to render report card PDF for submission %s: %s", submission.id, exc)
        return None
