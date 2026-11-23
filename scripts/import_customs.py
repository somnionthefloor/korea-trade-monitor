"""Build the static dashboard snapshot from official Customs CSV exports."""
import argparse
from collections import defaultdict
import csv
from datetime import date
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
CODES = {"1902301010", "3304999000", "8542321010", "8542321030"}
SOURCE_URL = "https://tradedata.go.kr/cts/index.do"


def clean_number(text, factor=1):
    value = text.strip().replace(",", "")
    if value in {"", "-"}:
        return None
    if not re.fullmatch(r"\d+", value):
        raise ValueError(f"Expected an integer in the selected unit, found {value!r}")
    return int(value) * factor


def ingest(paths, grouped_by_country):
    result = {}
    for path in paths:
        with path.open(encoding="utf-8-sig", newline="") as source:
            reader = csv.DictReader(source)
            required = {"기간", "HS코드", "수출 중량", "수출 금액", "수입 중량", "수입 금액"}
            if not required <= set(reader.fieldnames or ()) or ("국가" in reader.fieldnames) != grouped_by_country:
                raise ValueError(f"Unexpected Customs CSV columns: {path.name}")
            for row in reader:
                period = row["기간"]
                if period in {"총계", "합계"}:
                    continue
                code = row["HS코드"]
                if not re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])", period) or code not in CODES:
                    raise ValueError(f"Unexpected month or code in {path.name}: {period}, {code}")
                country = row["국가"].strip() if grouped_by_country else ""
                if grouped_by_country and not country:
                    raise ValueError(f"Blank partner in {path.name}: {period}, {code}")
                key = (code, period.replace("-", ""), country)
                if key in result:
                    raise ValueError(f"Duplicate Customs row for {key}")
                result[key] = {
                    flow: [clean_number(row[label + " 금액"], 1000), clean_number(row[label + " 중량"])]
                    for flow, label in (("X", "수출"), ("M", "수입"))
                }
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--world", nargs="+", type=Path, required=True)
    parser.add_argument("--partners", nargs="+", type=Path, required=True)
    parser.add_argument("--as-of", type=date.fromisoformat, required=True)
    options = parser.parse_args()
    world = ingest(options.world, False)
    countries = ingest(options.partners, True)
    if not world or not countries or any((code, month, "") not in world for code, month, _ in countries):
        raise ValueError("Partner rows require an official world total for each product and month")
    names = sorted({country for _, _, country in countries})
    ids = {"": "0", **{name: str(i) for i, name in enumerate(names, 1)}}
    series = {code: {"months": defaultdict(dict)} for code in sorted(CODES)}
    for (code, month, name), record in (world | countries).items():
        series[code]["months"][month][ids[name]] = record
    months = set(month for _, month, _ in world)
    if any(set(item["months"]) != months for item in series.values()):
        raise ValueError("Check the completeness of all four product histories")
    snapshot = {"source": "관세청 수출입무역통계", "sourceUrl": SOURCE_URL,
                "asOf": options.as_of.isoformat(),
                "partners": {code: name or "전체 국가" for name, code in ids.items()},
                "series": series}
    target = ROOT / "docs" / "snapshot.js"
    temp = target.with_suffix(".tmp")
    temp.write_text("globalThis.TRADE_DATA = " + json.dumps(snapshot, ensure_ascii=False, separators=(",", ":")) + ";\n",
                    encoding="utf-8")
    temp.replace(target)
    print(f"{len(world)} world rows / {len(countries)} partner rows / {len(names)} partner names")
    print(f"{len(months)} months from {min(months)} to {max(months)}")


if __name__ == "__main__":
    main()
