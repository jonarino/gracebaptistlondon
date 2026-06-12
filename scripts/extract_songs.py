#!/usr/bin/env python3
"""Extract song entries and dates from Service Order.pdf into data/songs.json.

Heuristic extractor using PyMuPDF and dateutil. See README for details.
"""
import sys
import re
import json
try:
    import fitz
except Exception:
    print("PyMuPDF not installed. Install with: pip install PyMuPDF")
    raise
from dateutil import parser as dateparser

DATE_PATTERNS = [
    r"[A-Z][a-z]{2,9} \d{1,2},? \d{4}",
    r"\d{1,2} [A-Z][a-z]{2,9} \d{4}",
    r"\d{4}-\d{2}-\d{2}",
    r"\d{1,2}/\d{1,2}/\d{2,4}",
]


def find_date_in_text(text):
    for pat in DATE_PATTERNS:
        m = re.search(pat, text)
        if m:
            s = m.group(0)
            try:
                dt = dateparser.parse(s, dayfirst=False)
                return dt.date().isoformat()
            except Exception:
                continue
    return None


def clean_title(line: str) -> str:
    line = line.strip()
    line = re.sub(r"^[\u2022\-\*\s]+", "", line)
    line = re.sub(r"\s+\([^\)]*\)$", "", line)
    return line


def parse_hymnal_flags(line: str):
    hymnal_id = None
    hymnal = False
    other_book = False
    m = re.search(r"#(\d{1,4})", line)
    if m:
        hymnal_id = int(m.group(1))
        if re.search(r"majesty", line, re.I):
            other_book = True
        else:
            hymnal = True
    else:
        m2 = re.search(r"majesty\D*(\d{1,4})", line, re.I)
        if m2:
            hymnal_id = int(m2.group(1))
            other_book = True
    return hymnal_id, hymnal, other_book


def extract(pdf_path: str):
    doc = fitz.open(pdf_path)
    records = []
    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text("text")
        page_date = find_date_in_text(text)
        lines = [l.strip() for l in text.splitlines() if l.strip()]
        for line in lines:
            if len(line) < 3 or len(line) > 120:
                continue
            if re.search(r"http|www\.|@|facebook|twitter|©|\bpage\b|service time|sermon|elder|minister|contact|address", line, re.I):
                continue
            if re.search(r"[A-Za-z]", line) and len(line.split()) >= 2:
                title = clean_title(line)
                hymnal_id, hymnal, other_book = parse_hymnal_flags(line)
                rec = {
                    "title": title,
                    "date": page_date,
                    "details": None,
                    "source": pdf_path,
                    "hymnal_id": hymnal_id,
                    "hymnal": hymnal,
                    "other_book": other_book,
                }
                if not any(r["title"] == rec["title"] and r["date"] == rec["date"] for r in records):
                    if title:
                        records.append(rec)
    for r in records:
        if r.get("date"):
            try:
                r["year"] = int(r["date"][:4])
            except Exception:
                r["year"] = None
        else:
            r["year"] = None
    return records


def main(argv):
    if len(argv) < 3:
        print("Usage: extract_songs.py <input.pdf> <output.json>")
        sys.exit(2)
    pdf_path = argv[1]
    out_path = argv[2]
    records = extract(pdf_path)
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(records, fh, ensure_ascii=False, indent=2)
    print(f"Wrote {len(records)} records to {out_path}")


if __name__ == "__main__":
    main(sys.argv)
