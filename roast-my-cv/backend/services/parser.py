import io
import re
from typing import Dict, Tuple

from docx import Document
from PyPDF2 import PdfReader


SECTION_PATTERNS = {
    "summary": r"(summary|profile|objective|about)",
    "experience": r"(experience|employment|work history|professional experience)",
    "education": r"(education|academic|qualifications)",
    "skills": r"(skills|technical skills|technologies|tooling)",
    "projects": r"(projects|portfolio|selected projects)",
}


def extract_pdf_text(content: bytes) -> str:
    reader = PdfReader(io.BytesIO(content))
    pages = [(page.extract_text() or "") for page in reader.pages]
    return "\n".join(pages).strip()


def extract_docx_text(content: bytes) -> str:
    document = Document(io.BytesIO(content))
    paragraphs = [paragraph.text for paragraph in document.paragraphs if paragraph.text.strip()]
    return "\n".join(paragraphs).strip()


def parse_cv(filename: str, content: bytes) -> Tuple[str, Dict[str, str]]:
    lowered = filename.lower()
    if lowered.endswith(".pdf"):
        text = extract_pdf_text(content)
    elif lowered.endswith(".docx"):
        text = extract_docx_text(content)
    else:
        raise ValueError("Only PDF and DOCX files are supported")

    cleaned = sanitize_text(text)
    if len(cleaned) < 80:
        raise ValueError("Could not extract enough text from that CV")
    return cleaned, detect_sections(cleaned)


def sanitize_text(text: str) -> str:
    text = text.replace("\x00", "")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()[:30000]


def detect_sections(text: str) -> Dict[str, str]:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    markers: list[tuple[int, str]] = []

    for index, line in enumerate(lines):
        normalized = re.sub(r"[^a-zA-Z ]", "", line).strip().lower()
        if len(normalized) > 45:
            continue
        for section, pattern in SECTION_PATTERNS.items():
            if re.fullmatch(pattern, normalized, flags=re.IGNORECASE):
                markers.append((index, section))

    sections = {name: "" for name in SECTION_PATTERNS}
    if not markers:
        sections["summary"] = "\n".join(lines[:8])
        sections["experience"] = "\n".join(lines[8:30])
        return sections

    markers = sorted(dict(markers).items())
    indexed_markers = sorted([(idx, section) for idx, section in dict(markers).items()])
    for position, (start, section) in enumerate(indexed_markers):
        end = indexed_markers[position + 1][0] if position + 1 < len(indexed_markers) else len(lines)
        sections[section] = "\n".join(lines[start + 1 : end]).strip()
    return sections
