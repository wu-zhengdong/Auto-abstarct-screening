import pytest

from backend.llm import LLMOutputError, _parse_criteria_normalization, _parse_screening_decision


def test_parse_plain_json_output() -> None:
    decision = _parse_screening_decision(
        """
        {
          "criteria_results": {
            "inclusion": [
              {
                "id": "I1",
                "text": "Adults aged 18 years or older",
                "judgment": "maybe",
                "reason": "The abstract mentions patients but does not state their ages."
              }
            ],
            "exclusion": [
              {
                "id": "E1",
                "text": "Animal-only study",
                "judgment": "no",
                "reason": "The abstract describes human participants."
              }
            ]
          },
          "final_decision": {
            "judgment": "maybe",
            "reason": "Population eligibility is unclear from the abstract."
          }
        }
        """
    )

    assert decision.criteria_results.inclusion[0].id == "I1"
    assert decision.criteria_results.inclusion[0].judgment == "maybe"
    assert decision.final_decision.judgment == "maybe"


def test_parse_code_fenced_json_output() -> None:
    decision = _parse_screening_decision(
        """```json
        {
          "criteria_results": {
            "inclusion": [],
            "exclusion": []
          },
          "final_decision": {
            "judgment": "no",
            "reason": "The model identified a clear exclusion criterion."
          }
        }
        ```"""
    )

    assert decision.final_decision.judgment == "no"


def test_parse_rejects_invalid_shape() -> None:
    with pytest.raises(LLMOutputError):
        _parse_screening_decision('{"comment":"missing keys"}')


def test_parse_criteria_normalization_output() -> None:
    result = _parse_criteria_normalization(
        """
        {
          "inclusion_criteria": [
            {
              "id": "I1",
              "raw_text": "children aged 6 to 17",
              "normalized_text": "Studies including children or adolescents aged 6 to 17 years."
            }
          ],
          "exclusion_criteria": [
            {
              "id": "E1",
              "raw_text": "review articles",
              "normalized_text": "Review articles."
            }
          ],
          "warnings": ["May require full-text review in some cases."]
        }
        """
    )

    assert result.inclusion_criteria[0].id == "I1"
    assert result.exclusion_criteria[0].normalized_text == "Review articles."
