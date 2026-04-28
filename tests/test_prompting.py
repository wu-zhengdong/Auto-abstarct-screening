from backend.models import CriterionInput, ScreeningRequest
from backend.prompting import build_system_instruction, build_user_input


def test_build_system_instruction_contains_criteria_and_schema() -> None:
    request = ScreeningRequest(
        title="Study title",
        abstract="Study abstract",
        inclusion_criteria=[
            CriterionInput(id="I1", text="Adults aged 18 years or older"),
        ],
        exclusion_criteria=[
            CriterionInput(id="E1", text="Review, editorial, commentary, or letter"),
        ],
    )

    prompt = build_system_instruction(request)

    assert "I1: Adults aged 18 years or older" in prompt
    assert "E1: Review, editorial, commentary, or letter" in prompt
    assert "high-sensitivity" in prompt
    assert "Minimize false negatives" in prompt
    assert "teenage" in prompt
    assert '"criteria_results"' in prompt
    assert '"yes | no | maybe"' in prompt


def test_build_user_input_contains_title_and_abstract_only() -> None:
    request = ScreeningRequest(
        title="My title",
        abstract="My abstract",
        inclusion_criteria=[
            CriterionInput(id="I1", text="Adults aged 18 years or older"),
        ],
        exclusion_criteria=[
            CriterionInput(id="E1", text="Animal-only study"),
        ],
    )

    user_input = build_user_input(request)

    assert "Title: My title" in user_input
    assert "Abstract:" in user_input
    assert "My abstract" in user_input
    assert "I1" not in user_input
    assert "E1" not in user_input
