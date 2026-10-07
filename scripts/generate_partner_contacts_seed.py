from __future__ import annotations

import datetime as dt
import re
from collections import Counter
from pathlib import Path

import pandas as pd


SOURCE = Path(r"C:\Users\Andrey\Dropbox\TYG\Kontakty_5_gorodov.xlsx")
OUTPUT = Path(__file__).resolve().parents[1] / "lib" / "db" / "migrations" / "0039_seed_partner_contacts.sql"

SHEETS = {
    "Отели": "hotel",
    "Консьерж-сервисы": "concierge",
    "Турагентства": "travel_agency",
    "Прокаты люкс": "luxury_rental",
}

COLUMNS = [
    "city",
    "organization",
    "email",
    "phone",
    "contact_person",
    "notes",
    "source_status",
    "source_checked_at",
    "source_url",
]

EMAIL_RE = re.compile(r"[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}", re.I)


def sql_quote(value: object) -> str:
    if value is None:
        return "NULL"
    text = str(value).strip()
    if not text or text.lower() == "nan":
        return "NULL"
    return "'" + text.replace("'", "''") + "'"


def sql_date(value: object) -> str:
    if value is None or pd.isna(value):
        return "NULL"
    if isinstance(value, (dt.datetime, dt.date, pd.Timestamp)):
        return sql_quote(pd.Timestamp(value).date().isoformat())
    text = str(value).strip()
    if not text or text.lower() == "nan":
        return "NULL"
    for fmt in ("%d.%m.%Y", "%Y-%m-%d"):
        try:
            return sql_quote(dt.datetime.strptime(text, fmt).date().isoformat())
        except ValueError:
            pass
    return "NULL"


def clean(value: object) -> str | None:
    if value is None or pd.isna(value):
        return None
    text = str(value).strip()
    return text or None


def main() -> None:
    rows: list[dict[str, object]] = []
    for sheet_name, category in SHEETS.items():
        frame = pd.read_excel(SOURCE, sheet_name=sheet_name, skiprows=4, header=None, names=COLUMNS)
        frame = frame[frame["city"].notna()]
        for _, row in frame.iterrows():
            emails = EMAIL_RE.findall(str(row.get("email") or ""))
            for email in emails:
                rows.append(
                    {
                        "city": clean(row.get("city")),
                        "category": category,
                        "organization": clean(row.get("organization")),
                        "email": email.strip(),
                        "phone": clean(row.get("phone")),
                        "contact_person": clean(row.get("contact_person")),
                        "notes": clean(row.get("notes")),
                        "source_status": clean(row.get("source_status")),
                        "source_checked_at": row.get("source_checked_at"),
                        "source_url": clean(row.get("source_url")),
                    }
                )

    seen: set[tuple[str, str, str, str]] = set()
    deduped: list[dict[str, object]] = []
    for row in rows:
        key = (
            str(row["city"]).lower(),
            str(row["category"]),
            str(row["organization"]).lower(),
            str(row["email"]).lower(),
        )
        if key in seen:
            continue
        seen.add(key)
        deduped.append(row)

    values = []
    for row in deduped:
        values.append(
            "  ("
            + ", ".join(
                [
                    sql_quote(row["city"]),
                    sql_quote(row["category"]),
                    sql_quote(row["organization"]),
                    sql_quote(row["email"]),
                    sql_quote(row["phone"]),
                    sql_quote(row["contact_person"]),
                    sql_quote(row["notes"]),
                    sql_quote(row["source_status"]),
                    sql_date(row["source_checked_at"]),
                    sql_quote(row["source_url"]),
                    sql_quote("new"),
                    "'[]'::jsonb",
                ]
            )
            + ")"
        )

    sql = "\n".join(
        [
            "-- Seed partner CRM contacts from Kontakty_5_gorodov.xlsx",
            "-- Generated for TransYachtGroup partner/concierge CRM.",
            "",
            "INSERT INTO partner_contacts (city, category, organization, email, phone, contact_person, notes, source_status, source_checked_at, source_url, status, tags) VALUES",
            ",\n".join(values),
            "ON CONFLICT DO NOTHING;",
            "",
        ]
    )
    OUTPUT.write_text(sql, encoding="utf-8")

    print(f"rows_raw={len(rows)}")
    print(f"rows_seed={len(deduped)}")
    print(f"output={OUTPUT}")
    print(f"by_category={dict(Counter(str(row['category']) for row in deduped))}")
    print(f"by_city={dict(Counter(str(row['city']) for row in deduped))}")


if __name__ == "__main__":
    main()
