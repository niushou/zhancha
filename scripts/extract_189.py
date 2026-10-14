#!/usr/bin/env python3
"""Extract the Third Wheel signs 1–189 from the cited CBETA HTML edition."""
from __future__ import annotations

import html
import json
import re
from pathlib import Path

import requests
from opencc import OpenCC

URL = "https://dlbs.liberal.ntu.edu.tw/BDLM/sutra/html/T17/T17n0839.htm"
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src" / "data" / "189WheelSigns.json"

DIGITS = {"一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9}

def chinese_number(text: str) -> int:
    total = current = 0
    for char in text:
        if char == "百":
            total += (current or 1) * 100
            current = 0
        elif char == "十":
            total += (current or 1) * 10
            current = 0
        else:
            current = DIGITS[char]
    return total + current

response = requests.get(URL, timeout=30)
response.raise_for_status()
# This legacy CBETA mirror explicitly declares Big5; do not trust requests' ISO-8859-1 default.
source_html = response.content.decode("big5", errors="replace")
text = html.unescape(re.sub(r"<[^>]+>", "", source_html))
text = html.unescape(re.sub(r"<[^>]+>", "", text))
text = re.sub(r"[\s\u3000]+", "", text)
start = text.find("一者求上乘")
end = text.find("是名一百八十九種善惡果報差別", start)
if start < 0 or end < 0:
    raise RuntimeError("Could not identify the exact 189-sign range in the cited CBETA page")
section = text[start:end]
markers = list(re.finditer(r"([一二三四五六七八九十百]+)者", section))
converter = OpenCC("t2s")
entries = []
for index, marker in enumerate(markers):
    number = chinese_number(marker.group(1))
    stop = markers[index + 1].start() if index + 1 < len(markers) else len(section)
    traditional = section[marker.end():stop].split("善男子", 1)[0].strip("：:，,。；;、‘’“”")
    if number != index + 1 or not traditional:
        raise RuntimeError(f"Invalid sequential entry at item {index + 1}: number={number}, text={traditional!r}")
    simplified = converter.convert(traditional)
    period = "现世" if number <= 160 else "过去世" if number <= 171 else "未来世"
    entries.append({"number": number, "textTraditional": traditional, "textSimplified": simplified, "period": period})
if len(entries) != 189:
    raise RuntimeError(f"Expected 189 signs, found {len(entries)}")
OUT.write_text(json.dumps(entries, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Wrote {len(entries)} verified signs to {OUT}")
print("First:", entries[0])
print("Last:", entries[-1])
