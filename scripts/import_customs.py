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
FX_URL = "https://ecos.bok.or.kr/"
PREFIX = "globalThis.TRADE_DATA = "
TARGET = ROOT / "docs" / "snapshot.js"
MONTH_RE = re.compile(r"\d{4}(0[1-9]|1[0-2])")


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


def read_fx(path):
    rates = {}
    with path.open(encoding="utf-8-sig", newline="") as source:
        for row in csv.DictReader(source):
            month = row["month"]
            value = float(row["krw_per_usd"])
            if not MONTH_RE.fullmatch(month) or month in rates or not 0 < value < 10000:
                raise ValueError(f"Invalid ECOS exchange rate for {month}")
            rates[month] = value
    return rates


def read_previous():
    text = TARGET.read_text(encoding="utf-8").strip()
    if not text.startswith(PREFIX) or not text.endswith(";"):
        raise ValueError("Existing snapshot does not have the expected format")
    old = json.loads(text[len(PREFIX):-1])
    records = {
        (code, month, "" if partner == "0" else old["partners"][partner]): values
        for code, item in old["series"].items()
        for month, entries in item["months"].items()
        for partner, values in entries.items()
    }
    return records, old["fx"]["rates"]


def month_index(period):
    return int(period[:4]) * 12 + int(period[-2:]) - 1


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--world", nargs="+", type=Path, required=True)
    parser.add_argument("--partners", nargs="+", type=Path, required=True)
    parser.add_argument("--fx", type=Path, required=True)
    parser.add_argument("--as-of", type=date.fromisoformat, required=True)
    parser.add_argument("--update", action="store_true", help="Replace only months included in the new exports")
    options = parser.parse_args()
    world = ingest(options.world, False)
    countries = ingest(options.partners, True)
    refreshed = {(code, month) for code, month, _ in world}
    if not refreshed or refreshed != {(code, month) for code, month, _ in countries}:
        raise ValueError("Country and world files must cover the same product-month pairs")
    rates = read_fx(options.fx)
    records = world | countries
    if options.update:
        old_records, old_rates = read_previous()
        records = {key: value for key, value in old_records.items() if key[:2] not in refreshed} | records
        rates = old_rates | rates

    names = sorted({country for _, _, country in records if country})
    ids = {"": "0", **{name: str(i) for i, name in enumerate(names, 1)}}
    series = {code: {"months": defaultdict(dict)} for code in sorted(CODES)}
    for (code, month, name), record in sorted(records.items()):
        series[code]["months"][month][ids[name]] = record
    months = sorted({month for _, month, _ in records})
    month_set = set(months)
    if len(months) != month_index(months[-1]) - month_index(months[0]) + 1:
        raise ValueError("Trade history contains a gap in calendar months")
    if any(set(item["months"]) != month_set for item in series.values()):
        raise ValueError("Check the completeness of all four product histories")
    missing_fx = month_set - rates.keys()
    if missing_fx:
        raise ValueError("Missing monthly ECOS rates: " + ", ".join(sorted(missing_fx)))
    snapshot = {
        "source": "관세청 수출입무역통계", "sourceUrl": SOURCE_URL,
        "asOf": options.as_of.isoformat(),
        "partners": {code: name or "전체 국가" for name, code in ids.items()},
        "fx": {"source": "한국은행 ECOS 731Y004", "url": FX_URL, "rates": {m: rates[m] for m in months}},
        "series": series
    }
    temp = TARGET.with_suffix(".tmp")
    temp.write_text(PREFIX + json.dumps(snapshot, ensure_ascii=False, separators=(",", ":")) + ";\n",
                    encoding="utf-8")
    temp.replace(TARGET)
    print(f"{len(records):,} rows · {len(names)} partners · {len(months)} months ({months[0]}–{months[-1]})")


if __name__ == "__main__":
    main()
