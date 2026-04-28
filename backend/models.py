import re
from pathlib import Path
from typing import Literal

from pydantic import AliasChoices, BaseModel, Field, field_validator, model_validator

from backend.app_settings import ProviderLiteral
from backend.config import SUPPORTED_SCREENING_MODELS


JudgmentLiteral = Literal["yes", "no", "maybe"]
ProjectStatusLiteral = Literal["idle", "running", "completed", "failed"]
ModelSlotLiteral = Literal["a", "b"]
ConsensusLiteral = Literal["agree", "partial", "conflict", "pending"]


class CriterionInput(BaseModel):
    id: str = Field(..., min_length=1)
    text: str = Field(..., min_length=1)

    @field_validator("id", "text")
    @classmethod
    def strip_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Value must not be blank.")
        return value


class NormalizedCriterion(BaseModel):
    id: str = Field(..., min_length=1)
    raw_text: str = Field(..., min_length=1)
    normalized_text: str = Field(..., min_length=1)

    @field_validator("id", "raw_text", "normalized_text")
    @classmethod
    def strip_normalized_fields(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Value must not be blank.")
        return value


class ScreeningRequest(BaseModel):
    title: str = Field(..., min_length=1)
    abstract: str = Field(..., min_length=1)
    inclusion_criteria: list[CriterionInput] = Field(..., min_length=1)
    exclusion_criteria: list[CriterionInput] = Field(..., min_length=1)

    @field_validator("title", "abstract")
    @classmethod
    def strip_study_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Value must not be blank.")
        return value


class CriterionResult(BaseModel):
    id: str = Field(..., min_length=1)
    text: str = Field(..., min_length=1)
    judgment: JudgmentLiteral
    reason: str = Field(..., min_length=1)


class CriteriaResults(BaseModel):
    inclusion: list[CriterionResult]
    exclusion: list[CriterionResult]


class FinalDecision(BaseModel):
    judgment: JudgmentLiteral
    reason: str = Field(..., min_length=1)


class ScreeningDecision(BaseModel):
    criteria_results: CriteriaResults
    final_decision: FinalDecision


class ScreeningResponse(ScreeningDecision):
    raw_model_output: str = Field(..., description="Raw textual output returned by the LLM")


class CriteriaNormalizationRequest(BaseModel):
    inclusion_text: str = Field(
        ...,
        min_length=1,
        validation_alias=AliasChoices("inclusion_text", "raw_inclusion_text"),
    )
    exclusion_text: str = Field(
        ...,
        min_length=1,
        validation_alias=AliasChoices("exclusion_text", "raw_exclusion_text"),
    )

    @field_validator("inclusion_text", "exclusion_text")
    @classmethod
    def strip_criteria_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Value must not be blank.")
        return value


class CriteriaNormalizationResult(BaseModel):
    inclusion_criteria: list[NormalizedCriterion] = Field(..., min_length=1)
    exclusion_criteria: list[NormalizedCriterion] = Field(..., min_length=1)
    warnings: list[str] = Field(default_factory=list)


class CriteriaNormalizationResponse(CriteriaNormalizationResult):
    raw_model_output: str = Field(..., min_length=1)


class StudyRecord(BaseModel):
    source_id: str = Field(..., min_length=1)
    title: str = Field(..., min_length=1)
    abstract: str = Field(..., min_length=1)
    doi: str | None = None
    year: str | None = None
    journal: str | None = None
    authors: list[str] = Field(default_factory=list)
    source_files: list[str] = Field(default_factory=list)
    dedupe_key: str = Field(..., min_length=1)
    ris_entry: str | None = None


def _validate_models(model_a: str, model_b: str) -> None:
    if model_a not in SUPPORTED_SCREENING_MODELS:
        raise ValueError(f"Unsupported model_a: {model_a}")
    if model_b not in SUPPORTED_SCREENING_MODELS:
        raise ValueError(f"Unsupported model_b: {model_b}")
    if model_a == model_b:
        raise ValueError("model_a and model_b must be different.")


class PreparedRunRequest(BaseModel):
    project_id: str | None = None
    project_name: str = Field(..., min_length=1)
    inclusion_criteria: list[CriterionInput] = Field(..., min_length=1)
    exclusion_criteria: list[CriterionInput] = Field(..., min_length=1)
    model_a: str = Field(..., min_length=1)
    model_b: str = Field(..., min_length=1)

    @field_validator("project_name", "model_a", "model_b")
    @classmethod
    def strip_project_fields(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Value must not be blank.")
        return value

    @model_validator(mode="after")
    def validate_models(self) -> "PreparedRunRequest":
        _validate_models(self.model_a, self.model_b)
        return self


RunStatusLiteral = Literal["prepared", "running", "completed", "failed", "cancelled"]


class ImportSummary(BaseModel):
    file_count: int = Field(ge=0)
    imported_count: int = Field(ge=0)
    deduplicated_count: int = Field(ge=0)
    duplicate_count: int = Field(ge=0)
    source_filenames: list[str] = Field(default_factory=list)
    per_file_imports: dict[str, int] = Field(default_factory=dict)


class RunCounts(BaseModel):
    """Per-model counts."""
    total: int = Field(ge=0)
    completed: int = Field(ge=0)
    yes: int = Field(ge=0)
    no: int = Field(ge=0)
    maybe: int = Field(ge=0)
    errors: int = Field(ge=0)
    pending: int = Field(ge=0)


class ModelRunStatus(BaseModel):
    model: str = Field(..., min_length=1)
    status: RunStatusLiteral
    counts: RunCounts
    started_at: str | None = None
    completed_at: str | None = None
    last_error: str | None = None


class PreparedRunResponse(BaseModel):
    run_id: str = Field(..., min_length=1)
    project_name: str = Field(..., min_length=1)
    model_a: str = Field(..., min_length=1)
    model_b: str = Field(..., min_length=1)
    status: RunStatusLiteral
    import_summary: ImportSummary
    counts_a: RunCounts
    counts_b: RunCounts


class StartRunResponse(BaseModel):
    run_id: str = Field(..., min_length=1)
    status: RunStatusLiteral
    message: str = Field(..., min_length=1)


class RunResultPreview(BaseModel):
    sequence: int = Field(ge=1)
    source_id: str = Field(..., min_length=1)
    title: str = Field(..., min_length=1)
    doi: str | None = None
    year: str | None = None
    journal: str | None = None
    judgment_a: JudgmentLiteral | None = None
    judgment_b: JudgmentLiteral | None = None
    consensus: ConsensusLiteral = "pending"


class RunStatusResponse(BaseModel):
    run_id: str = Field(..., min_length=1)
    project_name: str = Field(..., min_length=1)
    model_a: str = Field(..., min_length=1)
    model_b: str = Field(..., min_length=1)
    status: RunStatusLiteral
    status_a: RunStatusLiteral
    status_b: RunStatusLiteral
    import_summary: ImportSummary
    counts_a: RunCounts
    counts_b: RunCounts
    progress_percent_a: float = Field(ge=0, le=100)
    progress_percent_b: float = Field(ge=0, le=100)
    created_at: str = Field(..., min_length=1)
    started_at: str | None = None
    completed_at: str | None = None
    started_at_a: str | None = None
    completed_at_a: str | None = None
    last_error_a: str | None = None
    started_at_b: str | None = None
    completed_at_b: str | None = None
    last_error_b: str | None = None
    results_xlsx_url_a: str = Field(..., min_length=1)
    results_xlsx_url_b: str = Field(..., min_length=1)
    results_xlsx_url_combined: str = Field(..., min_length=1)
    errors_ris_url_a: str = Field(..., min_length=1)
    errors_ris_url_b: str = Field(..., min_length=1)
    result_count: int = Field(ge=0, default=0)
    new_results: list[RunResultPreview] = Field(default_factory=list)


class ModelRowResult(BaseModel):
    """Result of one model on one abstract."""
    source_id: str = Field(..., min_length=1)
    model: str = Field(..., min_length=1)
    final_judgment: JudgmentLiteral
    final_reason: str = Field(..., min_length=1)
    criterion_results: CriteriaResults
    raw_model_output: str = Field(..., min_length=1)
    status: Literal["done", "failed"] = "done"
    error: str | None = None
    attempt: int = Field(ge=1, default=1)
    updated_at: str = Field(..., min_length=1)


class HumanReviewUpdateRequest(BaseModel):
    judgment: JudgmentLiteral | None = None
    reason: str = ""

    @field_validator("reason")
    @classmethod
    def strip_review_reason(cls, value: str) -> str:
        return value.strip()


class ReviewItem(BaseModel):
    item_id: str = Field(..., min_length=1)
    sequence: int = Field(ge=1)
    source_id: str = Field(..., min_length=1)
    title: str = Field(..., min_length=1)
    abstract: str = ""
    doi: str | None = None
    year: str | None = None
    journal: str | None = None
    source_files: list[str] = Field(default_factory=list)
    import_filename: str | None = None
    linked_run_id: str | None = None
    ris_entry: str | None = None
    ris_source_filename: str | None = None
    judgment_a: JudgmentLiteral | None = None
    reason_a: str = ""
    criterion_results_a: CriteriaResults | None = None
    judgment_b: JudgmentLiteral | None = None
    reason_b: str = ""
    criterion_results_b: CriteriaResults | None = None
    consensus: ConsensusLiteral = "pending"
    human_judgment: JudgmentLiteral | None = None
    human_reason: str = ""
    reviewed_at: str | None = None

    @model_validator(mode="before")
    @classmethod
    def migrate_review_item(cls, data):
        if not isinstance(data, dict):
            return data

        item_id = str(data.get("item_id") or data.get("source_id") or "").strip()
        if item_id:
            data["item_id"] = item_id

        import_filename = str(data.get("import_filename") or data.get("review_source_filename") or "").strip()
        if import_filename:
            data["import_filename"] = import_filename

        return data


class ReviewCounts(BaseModel):
    total: int = Field(ge=0)
    consensus_agree: int = Field(ge=0)
    consensus_partial: int = Field(ge=0)
    consensus_conflict: int = Field(ge=0)
    consensus_pending: int = Field(ge=0)
    reviewed: int = Field(ge=0)
    needs_review_total: int = Field(default=0, ge=0)
    needs_review_reviewed: int = Field(default=0, ge=0)
    human_yes: int = Field(ge=0)
    human_no: int = Field(ge=0)
    human_maybe: int = Field(ge=0)


class ReviewWorkspaceResponse(BaseModel):
    run_id: str = Field(..., min_length=1)
    project_name: str = Field(..., min_length=1)
    model_a: str = Field(..., min_length=1)
    model_b: str = Field(..., min_length=1)
    counts: ReviewCounts
    items: list[ReviewItem] = Field(default_factory=list)


class ReviewProjectCreateRequest(BaseModel):
    name: str = Field(..., min_length=1)

    @field_validator("name")
    @classmethod
    def strip_review_project_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Value must not be blank.")
        return value


class ReviewProjectUpdateRequest(BaseModel):
    name: str = Field(..., min_length=1)

    @field_validator("name")
    @classmethod
    def strip_review_project_update_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Value must not be blank.")
        return value


class ReviewProjectSummary(BaseModel):
    project_id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    source_filename: str = Field(..., min_length=1)
    source_filenames: list[str] = Field(default_factory=list)
    created_at: str = Field(..., min_length=1)
    updated_at: str = Field(..., min_length=1)
    counts: ReviewCounts

    @model_validator(mode="before")
    @classmethod
    def migrate_review_project_summary(cls, data):
        if not isinstance(data, dict):
            return data

        project_id = str(data.get("project_id") or data.get("session_id") or "").strip()
        if project_id:
            data["project_id"] = project_id

        source_filenames = data.get("source_filenames")
        if not isinstance(source_filenames, list):
            source_filename = str(data.get("source_filename") or "").strip()
            source_filenames = [source_filename] if source_filename else []
        data["source_filenames"] = [str(value).strip() for value in source_filenames if str(value).strip()]

        name = str(data.get("name") or "").strip()
        if not name:
            data["name"] = _default_review_project_name(data["source_filenames"], project_id=project_id)

        source_filename = str(data.get("source_filename") or "").strip()
        if not source_filename:
            data["source_filename"] = _summarize_review_source_filenames(data["source_filenames"])

        return data


class ReviewProjectDetail(ReviewProjectSummary):
    items: list[ReviewItem] = Field(default_factory=list)


class ReviewProjectListResponse(BaseModel):
    projects: list[ReviewProjectSummary]


class ApiKeyStatus(BaseModel):
    provider: ProviderLiteral
    provider_label: str = Field(..., min_length=1)
    has_api_key: bool
    key_preview: str | None = None
    source: Literal["local", "environment", "none"]


class ApiKeyStatusResponse(BaseModel):
    providers: list[ApiKeyStatus]


class ApiKeySaveRequest(BaseModel):
    provider: ProviderLiteral
    api_key: str = Field(..., min_length=1)
    model: str | None = None

    @field_validator("api_key")
    @classmethod
    def strip_api_key(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("API key must not be blank.")
        return value

    @field_validator("model")
    @classmethod
    def strip_api_key_test_model(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        if not value:
            return None
        if value not in SUPPORTED_SCREENING_MODELS:
            raise ValueError(f"Unsupported model: {value}")
        return value


class ApiKeySaveResponse(ApiKeyStatus):
    message: str = Field(..., min_length=1)


class PersistedRunState(BaseModel):
    run_id: str = Field(..., min_length=1)
    project_id: str | None = None
    project_name: str = Field(..., min_length=1)
    model_a: str = Field(..., min_length=1)
    model_b: str = Field(..., min_length=1)
    status_a: RunStatusLiteral
    status_b: RunStatusLiteral
    created_at: str = Field(..., min_length=1)
    started_at: str | None = None
    completed_at: str | None = None
    started_at_a: str | None = None
    completed_at_a: str | None = None
    last_error_a: str | None = None
    started_at_b: str | None = None
    completed_at_b: str | None = None
    last_error_b: str | None = None
    import_summary: ImportSummary
    counts_a: RunCounts
    counts_b: RunCounts
    inclusion_criteria: list[CriterionInput]
    exclusion_criteria: list[CriterionInput]

    @model_validator(mode="after")
    def validate_models(self) -> "PersistedRunState":
        _validate_models(self.model_a, self.model_b)
        return self

    @property
    def overall_status(self) -> RunStatusLiteral:
        return _derive_overall_status(self.status_a, self.status_b)


def _derive_overall_status(status_a: RunStatusLiteral, status_b: RunStatusLiteral) -> RunStatusLiteral:
    statuses = (status_a, status_b)
    if "running" in statuses:
        return "running"
    if all(s == "completed" for s in statuses):
        return "completed"
    if "failed" in statuses and "running" not in statuses:
        return "failed"
    if "cancelled" in statuses and "running" not in statuses:
        return "cancelled"
    return "prepared"


class ProjectCreateRequest(BaseModel):
    name: str = Field(..., min_length=1)
    description: str = ""
    model_a: str | None = None
    model_b: str | None = None

    @field_validator("name", "description")
    @classmethod
    def strip_project_create_fields(cls, value: str) -> str:
        return value.strip()

    @field_validator("model_a", "model_b")
    @classmethod
    def strip_and_validate_create_project_model(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        if not value:
            return None
        if value not in SUPPORTED_SCREENING_MODELS:
            raise ValueError(f"Unsupported model: {value}")
        return value


class ProjectUpdateRequest(BaseModel):
    name: str = Field(..., min_length=1)
    description: str = ""
    model_a: str | None = None
    model_b: str | None = None

    @field_validator("name", "description")
    @classmethod
    def strip_project_update_fields(cls, value: str) -> str:
        return value.strip()

    @field_validator("model_a", "model_b")
    @classmethod
    def strip_and_validate_project_model(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        if not value:
            return None
        if value not in SUPPORTED_SCREENING_MODELS:
            raise ValueError(f"Unsupported model: {value}")
        return value

    @model_validator(mode="after")
    def models_must_differ(self) -> "ProjectUpdateRequest":
        if self.model_a and self.model_b and self.model_a == self.model_b:
            raise ValueError("model_a and model_b must be different.")
        return self


class ProjectCriteriaUpdateRequest(BaseModel):
    inclusion_criteria: list[CriterionInput] = Field(..., min_length=1)
    exclusion_criteria: list[CriterionInput] = Field(..., min_length=1)


class ProjectImportResponse(BaseModel):
    project_id: str = Field(..., min_length=1)
    import_summary: ImportSummary


class ProjectSummary(BaseModel):
    project_id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    description: str = ""
    status: ProjectStatusLiteral
    paper_count: int = Field(ge=0)
    duplicate_count: int = Field(ge=0)
    created_at: str = Field(..., min_length=1)
    updated_at: str = Field(..., min_length=1)
    latest_run_id: str | None = None


class ProjectDetail(ProjectSummary):
    inclusion_criteria: list[CriterionInput] = Field(default_factory=list)
    exclusion_criteria: list[CriterionInput] = Field(default_factory=list)
    import_summary: ImportSummary = Field(
        default_factory=lambda: ImportSummary(
            file_count=0,
            imported_count=0,
            deduplicated_count=0,
            duplicate_count=0,
        )
    )
    model_a: str = Field(..., min_length=1)
    model_b: str = Field(..., min_length=1)


class ProjectListResponse(BaseModel):
    projects: list[ProjectSummary]


def _summarize_review_source_filenames(source_filenames: list[str]) -> str:
    cleaned = [value.strip() for value in source_filenames if value.strip()]
    if not cleaned:
        return "Imported results"
    if len(cleaned) == 1:
        return cleaned[0]
    return f"{cleaned[0]} + {len(cleaned) - 1} more"


def _default_review_project_name(source_filenames: list[str], *, project_id: str = "") -> str:
    cleaned = [value.strip() for value in source_filenames if value.strip()]
    if len(cleaned) > 1:
        return f"Combined review ({len(cleaned)} files)"

    candidate = Path(cleaned[0]).stem if cleaned else project_id or "Review project"
    candidate = candidate.strip()
    if not candidate:
        return "Review project"

    candidate = re.sub(r"(?i)(?:[_\-\s]+results?)$", "", candidate).strip("_- ")
    run_match = re.fullmatch(r"run[_-](\d{8})[_-](\d{6})(?:[_-]([a-z0-9]+))?", candidate, flags=re.IGNORECASE)
    if run_match:
        date_token, time_token, suffix = run_match.groups()
        date_label = f"{date_token[:4]}-{date_token[4:6]}-{date_token[6:8]}"
        time_label = f"{time_token[:2]}:{time_token[2:4]}"
        suffix_label = f" {suffix}" if suffix else ""
        return f"Review {date_label} {time_label}{suffix_label}"

    words = [part for part in re.split(r"[_\-\s]+", candidate) if part]
    if not words:
        return "Review project"

    def normalize_word(word: str) -> str:
        if word.isupper() or any(char.isdigit() for char in word):
            return word
        return word.capitalize()

    return " ".join(normalize_word(word) for word in words)


def compute_consensus(judgment_a: JudgmentLiteral | None, judgment_b: JudgmentLiteral | None) -> ConsensusLiteral:
    if judgment_a is None or judgment_b is None:
        return "pending"
    if judgment_a == judgment_b:
        return "agree"
    pair = {judgment_a, judgment_b}
    if pair == {"yes", "no"}:
        return "conflict"
    return "partial"
