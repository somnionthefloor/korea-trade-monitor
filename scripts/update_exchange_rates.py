"""Refresh Bank of Korea USD/KRW monthly rates without storing trade data."""
import argparse
import json
from pathlib import Path
import re
from urllib.request import urlopen

PREFIX = "globalThis.TRADE_DATA = "
OUTPUT = Path(__file__).resolve().parents[1] / "docs" / "snapshot.js"


def month_index(period):
    if not re.fullmatch(r"20\d{2}(0[1-9]|1[0-2])", period):
        raise ValueError(f"Expected YYYYMM, found {period!r}")
    return int(period[:4]) * 12 + int(period[4:]) - 1


def fetch(window):
    url = (
        "https://ecos.bok.or.kr/api/StatisticSearch/sample/json/kr/1/10/"
        f"731Y004/M/{window[0]}/{window[-1]}/0000001/0000100"
    )
    with urlopen(url, timeout=20) as response:
        rows = json.load(response)["StatisticSearch"]["row"]
    rates = {row["TIME"]: float(row["DATA_VALUE"]) for row in rows
             if row["ITEM_CODE1"] == "0000001" and row["ITEM_CODE2"] == "0000100"}
    if set(rates) != set(window) or any(not 0 < rate < 10000 for rate in rates.values()):
        raise ValueError("ECOS response did not contain all requested monthly averages")
    return rates


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--start", required=True)
    parser.add_argument("--end", required=True)
    options = parser.parse_args()
    months = [f"{i // 12:04}{i % 12 + 1:02}"
              for i in range(month_index(options.start), month_index(options.end) + 1)]
    if not months:
        raise ValueError("Start month must precede or equal end month")
    snapshot = json.loads(OUTPUT.read_text(encoding="utf-8").strip()[len(PREFIX):-1])
    for start in range(0, len(months), 10):
        snapshot["fx"]["rates"].update(fetch(months[start:start + 10]))
    output = OUTPUT.with_suffix(".tmp")
    output.write_text(PREFIX + json.dumps(snapshot, ensure_ascii=False, separators=(",", ":")) + ";\n",
                      encoding="utf-8")
    output.replace(OUTPUT)
    print(f"Updated {len(months)} ECOS months ({months[0]}–{months[-1]})")


if __name__ == "__main__":
    main()
