from backend.criteria_prompting import (
    CRITERIA_NORMALIZATION_SYSTEM_PROMPT,
    build_criteria_normalization_input,
)
from backend.llm import QwenScreeningClient
from backend.models import (
    CriteriaNormalizationRequest,
    CriteriaNormalizationResponse,
)


class CriteriaNormalizationService:
    def __init__(self, client: QwenScreeningClient) -> None:
        self._client = client

    def normalize(
        self,
        request: CriteriaNormalizationRequest,
        *,
        model_override: str | None = None,
    ) -> CriteriaNormalizationResponse:
        result, raw_output = self._client.normalize_criteria(
            system_instruction=CRITERIA_NORMALIZATION_SYSTEM_PROMPT,
            user_input=build_criteria_normalization_input(request),
            model_override=model_override,
        )
        return CriteriaNormalizationResponse(
            inclusion_criteria=result.inclusion_criteria,
            exclusion_criteria=result.exclusion_criteria,
            warnings=result.warnings,
            raw_model_output=raw_output,
        )
