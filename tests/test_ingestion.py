from backend.ingestion import build_dedupe_key, load_ris_studies, parse_criteria_text


def test_parse_criteria_text_assigns_incrementing_ids() -> None:
    criteria = parse_criteria_text(
        """
        adults aged 18+

        evaluates a generative llm in medicine
        """,
        "I",
    )

    assert [item.id for item in criteria] == ["I1", "I2"]
    assert criteria[0].text == "adults aged 18+"


def test_build_dedupe_key_prefers_doi_then_title() -> None:
    assert build_dedupe_key(title="A Study", doi="10.1000/ABC", abstract="First") == "doi::10.1000/abc"
    assert build_dedupe_key(title="A Study", doi=None, abstract="First abstract") == "title::a study"


def test_load_ris_studies_deduplicates_across_files() -> None:
    ris_payload_one = b"""TY  - JOUR\nTI  - Sample Study\nAB  - First abstract.\nDO  - 10.1000/test\nER  - \n"""
    ris_payload_two = b"""TY  - JOUR\nTI  - Sample Study\nAB  - Second abstract.\nDO  - 10.1000/test\nER  - \n"""

    studies, summary = load_ris_studies(
        [
            ("one.ris", ris_payload_one),
            ("two.ris", ris_payload_two),
        ]
    )

    assert summary.file_count == 2
    assert summary.imported_count == 2
    assert summary.deduplicated_count == 1
    assert summary.duplicate_count == 1
    assert len(studies) == 1
    assert studies[0].doi == "10.1000/test"
    assert studies[0].source_files == ["one.ris", "two.ris"]
