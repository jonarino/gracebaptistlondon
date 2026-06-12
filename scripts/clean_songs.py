#!/usr/bin/env python3
"""Clean extracted songs JSON to remove obvious non-song entries.

Usage:
  python scripts/clean_songs.py data/songs.json data/songs.cleaned.json
"""
import sys
import json
import re

def is_time(s):
    return bool(re.search(r"\b\d{1,2}:\d{2}\s*(AM|PM|am|pm)?\b", s))

def is_note_like(s):
    s2 = s.lower()
    bad_keywords = ['pastoral', 'scripture', 'prayer', 'talk to', 'get someone', 'service time', 'grandma', 'dropping of stones', 'open house', 'page', 'contact', 'address', 'minister', 'elder', 'sermon', 'am', 'pm']
    if any(k in s2 for k in bad_keywords):
        return True
    if s.startswith('[') and s.endswith(']'):
        return True
    # short numeric headings like '11' or single-word instructions
    if len(s.split()) <= 1:
        return True
    # all-lowercase starting verbs like 'talk', 'get'
    if re.match(r"^(talk|get|check|confirm|phone)\b", s2):
        return True
    return False

def clean(inpath,outpath):
    with open(inpath,encoding='utf-8') as fh:
        data = json.load(fh)
    cleaned = []
    for r in data:
        t = (r.get('title') or '').strip()
        if not t:
            continue
        if is_time(t):
            continue
        if is_note_like(t):
            continue
        # filter lines that look like dates
        if re.match(r"^[A-Z][a-z]+ \d{1,2}, \d{4}$", t):
            continue
        cleaned.append(r)
    with open(outpath,'w',encoding='utf-8') as fh:
        json.dump(cleaned, fh, ensure_ascii=False, indent=2)
    print(f"Wrote {len(cleaned)} cleaned records to {outpath}")

if __name__ == '__main__':
    if len(sys.argv)<3:
        print('Usage: clean_songs.py in.json out.json')
        sys.exit(2)
    clean(sys.argv[1], sys.argv[2])
