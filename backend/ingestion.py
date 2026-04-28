import re
from io import StringIO
from typing import Iterable

import rispy

from backend.models import CriterionInput, ImportSummary, StudyRecord


def parse_criteria_text(raw_text: str, prefix: str) -> list[CriterionInput]:
    lines = [line.strip() for line in raw_text.splitlines()]
    items = [line for line in lines if line]
    if not items:
        raise ValueError("At least one criterion is required.")

    return [
        CriterionInput(
            id=f"{prefix}{index}",
            text=item,
        )
        for index, item in enumerate(items, start=1)
    ]


def load_ris_studies(files: Iterable[tuple[str, bytes]]) -> tuple[list[StudyRecord], ImportSummary]:
    imported_count = 0
    deduped: dict[str, StudyRecord] = {}
    file_count = 0
    sequence = 0
    source_filenames: list[str] = []
    per_file_imports: dict[str, int] = {}

    for file_name, payload in files:
        file_count += 1
        if file_name and file_name not in source_filenames:
            source_filenames.append(file_name)
        records = load_ris_records_with_raw(payload)
        per_file_imports[file_name] = per_file_imports.get(file_name, 0) + len(records)
        for record, raw_entry in records:
            imported_count += 1
            title = _clean_value(record.get("title")) or _clean_value(record.get("primary_title"))
            raw_abstract = _clean_value(record.get("abstract")) or _clean_value(record.get("notes_abstract"))
            abstract = raw_abstract or "No abstract available."
            if not title:
                continue

            sequence += 1
            doi = _normalize_doi(
                _clean_value(record.get("doi"))
                or _clean_value(record.get("first_doi"))
                or _clean_value(record.get("accession_number"))
            )
            year = _clean_value(record.get("year")) or _clean_value(record.get("publication_year"))
            journal = (
                _clean_value(record.get("journal_name"))
                or _clean_value(record.get("secondary_title"))
                or _clean_value(record.get("custom3"))
            )
            authors = _normalize_authors(record.get("authors"))
            dedupe_key = build_dedupe_key(title=title, doi=doi, abstract=raw_abstract or "")

            study = StudyRecord(
                source_id=f"S{sequence}",
                title=title,
                abstract=abstract,
                doi=doi,
                year=year,
                journal=journal,
                authors=authors,
                source_files=[file_name],
                dedupe_key=dedupe_key,
                ris_entry=raw_entry,
            )

            existing = deduped.get(dedupe_key)
            if existing is None:
                deduped[dedupe_key] = study
                continue

            merged_files = sorted({*existing.source_files, file_name})
            deduped[dedupe_key] = existing.model_copy(update={"source_files": merged_files})

    unique_records = list(deduped.values())
    summary = ImportSummary(
        file_count=file_count,
        imported_count=imported_count,
        deduplicated_count=len(unique_records),
        duplicate_count=max(imported_count - len(unique_records), 0),
        source_filenames=source_filenames,
        per_file_imports=per_file_imports,
    )
    return unique_records, summary


def build_dedupe_key(*, title: str, doi: str | None, abstract: str) -> str:
    normalized_doi = _normalize_doi(doi)
    if normalized_doi:
        return f"doi::{normalized_doi}"

    normalized_title = _normalize_text(title)
    normalized_abstract = _normalize_text(abstract)
    if normalized_title:
        return f"title::{normalized_title}"
    return f"title_abstract::{normalized_title}::{normalized_abstract}"


def load_ris_records_with_raw(payload: bytes) -> list[tuple[dict, str]]:
    text = payload.decode("utf-8-sig", errors="ignore")
    records = rispy.load(StringIO(text))
    raw_entries = _split_raw_ris_entries(text)
    if len(raw_entries) != len(records):
        raw_entries = [_record_to_ris_entry(record) for record in records]
    return list(zip(records, raw_entries, strict=False))


def _split_raw_ris_entries(text: str) -> list[str]:
    entries: list[list[str]] = []
    current: list[str] = []
    for raw_line in text.replace("\r\n", "\n").replace("\r", "\n").split("\n"):
        line = raw_line.rstrip()
        if not line and not current:
            continue
        current.append(line)
        if line.startswith("ER  -"):
            entries.append(current)
            current = []
    return ["\n".join(entry).strip() for entry in entries if any(line.strip() for line in entry)]


def _record_to_ris_entry(record: dict) -> str:
    lines = ["TY  - JOUR"]
    title = _clean_value(record.get("title")) or _clean_value(record.get("primary_title"))
    if title:
        lines.append(f"TI  - {_ris_safe(title)}")
    for author in _normalize_authors(record.get("authors")):
        lines.append(f"AU  - {_ris_safe(author)}")
    year = _clean_value(record.get("year")) or _clean_value(record.get("publication_year"))
    if year:
        lines.append(f"PY  - {_ris_safe(year)}")
    journal = (
        _clean_value(record.get("journal_name"))
        or _clean_value(record.get("secondary_title"))
        or _clean_value(record.get("custom3"))
    )
    if journal:
        lines.append(f"JO  - {_ris_safe(journal)}")
    doi = _normalize_doi(
        _clean_value(record.get("doi"))
        or _clean_value(record.get("first_doi"))
        or _clean_value(record.get("accession_number"))
    )
    if doi:
        lines.append(f"DO  - {_ris_safe(doi)}")
    abstract = _clean_value(record.get("abstract")) or _clean_value(record.get("notes_abstract"))
    if abstract:
        lines.append(f"AB  - {_ris_safe(abstract)}")
    lines.append("ER  -")
    return "\n".join(lines)


def _normalize_authors(value: object) -> list[str]:
    if isinstance(value, list):
        return [item.strip() for item in value if isinstance(item, str) and item.strip()]
    if isinstance(value, str) and value.strip():
        return [value.strip()]
    return []


def _clean_value(value: object) -> str | None:
    if value is None:
        return None
    if isinstance(value, list):
        joined = " ".join(str(item).strip() for item in value if str(item).strip())
        return joined or None
    cleaned = str(value).strip()
    return cleaned or None


def _normalize_doi(value: str | None) -> str | None:
    if not value:
        return None
    cleaned = value.strip().lower()
    cleaned = cleaned.removeprefix("https://doi.org/")
    cleaned = cleaned.removeprefix("http://doi.org/")
    cleaned = cleaned.removeprefix("doi:")
    return cleaned.strip() or None


def _normalize_text(value: str) -> str:
    lowered = value.lower()
    lowered = re.sub(r"[^a-z0-9\s]", " ", lowered)
    lowered = re.sub(r"\s+", " ", lowered).strip()
    return lowered


def _ris_safe(value: str) -> str:
    return " ".join(value.replace("\r", " ").replace("\n", " ").split())
