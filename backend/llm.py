import json
from json import JSONDecodeError

from openai import OpenAI

from backend.app_settings import ProviderLiteral, UserSettingsStore, model_provider
from backend.config import Settings
from backend.models import CriteriaNormalizationResult, ScreeningDecision


class LLMOutputError(ValueError):
    """Raised when model output cannot be parsed into the required schema."""


class ScreeningLLMClient:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    def screen(
        self,
        *,
        system_instruction: str,
        user_input: str,
        model_override: str | None = None,
    ) -> tuple[ScreeningDecision, str]:
        output_text = self._create_text_response(
            system_instruction=system_instruction,
            user_input=user_input,
            model_override=model_override,
        )
        decision = _parse_screening_decision(output_text)
        return decision, output_text

    def normalize_criteria(
        self,
        *,
        system_instruction: str,
        user_input: str,
        model_override: str | None = None,
    ) -> tuple[CriteriaNormalizationResult, str]:
        output_text = self._create_text_response(
            system_instruction=system_instruction,
            user_input=user_input,
            model_override=model_override,
        )
        decision = _parse_criteria_normalization(output_text)
        return decision, output_text

    def _create_text_response(
        self,
        *,
        system_instruction: str,
        user_input: str,
        model_override: str | None = None,
    ) -> str:
        model = model_override or self._settings.screening_model_a
        provider = model_provider(model)
        if provider == "deepseek":
            return self._create_deepseek_response(
                model=model,
                system_instruction=system_instruction,
                user_input=user_input,
            )
        return self._create_qwen_response(
            model=model,
            system_instruction=system_instruction,
            user_input=user_input,
        )

    def _create_qwen_response(
        self,
        *,
        model: str,
        system_instruction: str,
        user_input: str,
    ) -> str:
        api_key = UserSettingsStore().get_local_api_key("dashscope")
        if not api_key:
            raise LLMOutputError("DASHSCOPE_API_KEY is not configured.")

        client = OpenAI(
            api_key=api_key,
            base_url=self._settings.dashscope_base_url,
        )
        response = client.responses.create(
            model=model,
            input=[
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": user_input},
            ],
            extra_body={
                "enable_thinking": self._settings.enable_thinking,
            },
        )
        return _collect_text_output(response.output)

    def _create_deepseek_response(
        self,
        *,
        model: str,
        system_instruction: str,
        user_input: str,
    ) -> str:
        api_key = UserSettingsStore().get_local_api_key("deepseek")
        if not api_key:
            raise LLMOutputError("DEEPSEEK_API_KEY is not configured.")

        client = OpenAI(
            api_key=api_key,
            base_url=self._settings.deepseek_base_url,
        )
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": user_input},
            ],
            stream=False,
            reasoning_effort="high",
            extra_body={"thinking": {"type": "enabled"}},
        )
        choice = (response.choices or [None])[0]
        message = getattr(choice, "message", None)
        content = getattr(message, "content", None)
        text = _coerce_chat_content_to_text(content)
        if not text:
            raise LLMOutputError("Model returned no message content.")
        return text


QwenScreeningClient = ScreeningLLMClient


def test_api_key(
    *,
    provider: ProviderLiteral,
    api_key: str,
    settings: Settings,
    model: str | None = None,
) -> None:
    if provider == "deepseek":
        _test_deepseek_api_key(api_key=api_key, settings=settings, model=model or "deepseek-v4-flash")
        return
    _test_dashscope_api_key(api_key=api_key, settings=settings, model=model or "qwen3.6-flash")


def _test_dashscope_api_key(*, api_key: str, settings: Settings, model: str) -> None:
    client = OpenAI(
        api_key=api_key,
        base_url=settings.dashscope_base_url,
        timeout=30,
    )
    client.responses.create(
        model=model,
        input=[
            {"role": "system", "content": "You are a connection test. Reply with OK only."},
            {"role": "user", "content": "Return OK."},
        ],
        max_output_tokens=8,
        extra_body={"enable_thinking": False},
    )


def _test_deepseek_api_key(*, api_key: str, settings: Settings, model: str) -> None:
    client = OpenAI(
        api_key=api_key,
        base_url=settings.deepseek_base_url,
        timeout=30,
    )
    client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": "You are a connection test. Reply with OK only."},
            {"role": "user", "content": "Return OK."},
        ],
        max_tokens=8,
        stream=False,
    )


def _collect_text_output(output_items: list[object]) -> str:
    chunks: list[str] = []
    for item in output_items:
        item_type = getattr(item, "type", None)
        if item_type != "message":
            continue

        content = getattr(item, "content", []) or []
        for block in content:
            text = getattr(block, "text", None)
            if text:
                chunks.append(text)

    combined = "\n".join(chunks).strip()
    if not combined:
        raise LLMOutputError("Model returned no message content.")
    return combined


def _coerce_chat_content_to_text(content: object) -> str:
    if isinstance(content, str):
        return content.strip()

    if not isinstance(content, list):
        return ""

    chunks: list[str] = []
    for item in content:
        if isinstance(item, dict):
            text = item.get("text")
        else:
            text = getattr(item, "text", None)
        if text:
            chunks.append(str(text))
    return "\n".join(chunks).strip()


def _parse_screening_decision(raw_text: str) -> ScreeningDecision:
    payload = _extract_payload(raw_text)

    try:
        return ScreeningDecision.model_validate(payload)
    except Exception as exc:
        raise LLMOutputError(f"Model output did not match schema: {exc}") from exc


def _parse_criteria_normalization(raw_text: str) -> CriteriaNormalizationResult:
    payload = _extract_payload(raw_text)
    try:
        return CriteriaNormalizationResult.model_validate(payload)
    except Exception as exc:
        raise LLMOutputError(f"Criteria normalization output did not match schema: {exc}") from exc


def _strip_code_fence(text: str) -> str:
    lines = text.splitlines()
    if len(lines) >= 2 and lines[0].startswith("```") and lines[-1].startswith("```"):
        return "\n".join(lines[1:-1]).strip()
    return text


def _extract_json_object(text: str) -> dict:
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise LLMOutputError("No JSON object found in model output.")

    snippet = text[start : end + 1]
    try:
        return json.loads(snippet)
    except JSONDecodeError as exc:
        raise LLMOutputError("Could not parse JSON object from model output.") from exc


def _extract_payload(raw_text: str) -> dict:
    candidate = raw_text.strip()
    if candidate.startswith("```"):
        candidate = _strip_code_fence(candidate)
    try:
        return json.loads(candidate)
    except JSONDecodeError:
        return _extract_json_object(candidate)
