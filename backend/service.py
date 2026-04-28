from backend.llm import QwenScreeningClient
from backend.models import ScreeningRequest, ScreeningResponse
from backend.prompting import build_system_instruction, build_user_input


class ScreeningService:
    def __init__(self, client: QwenScreeningClient) -> None:
        self._client = client

    def screen(self, request: ScreeningRequest, *, model_override: str | None = None) -> ScreeningResponse:
        system_instruction = build_system_instruction(request)
        user_input = build_user_input(request)
        decision, raw_output = self._client.screen(
            system_instruction=system_instruction,
            user_input=user_input,
            model_override=model_override,
        )
        return ScreeningResponse(
            criteria_results=decision.criteria_results,
            final_decision=decision.final_decision,
            raw_model_output=raw_output,
        )
