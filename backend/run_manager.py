import csv
import json
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import UTC, datetime
from pathlib import Path
from typing import Callable, Iterable
from uuid import uuid4

from openpyxl import Workbook

from backend.config import Settings
from backend.models import (
    ConsensusLiteral,
    CriteriaResults,
    CriterionInput,
    CriterionResult,
    HumanReviewUpdateRequest,
    ImportSummary,
    JudgmentLiteral,
    ModelRowResult,
    ModelSlotLiteral,
    PersistedRunState,
    PreparedRunRequest,
    PreparedRunResponse,
    ReviewCounts,
    ReviewItem,
    ReviewWorkspaceResponse,
    RunCounts,
    RunResultPreview,
    RunStatusResponse,
    ScreeningRequest,
    StartRunResponse,
    StudyRecord,
    compute_consensus,
)
from backend.service import ScreeningService


REVIEW_HEADERS = [
    "source_id",
    "human_judgment",
    "human_reason",
    "reviewed_at",
]

ERROR_HEADERS = [
    "source_id",
    "title",
    "attempts",
    "error",
]

SLOTS: tuple[ModelSlotLiteral, ModelSlotLiteral] = ("a", "b")


class RunNotFoundError(FileNotFoundError):
    pass


class RunExportEmptyError(FileNotFoundError):
    pass


class RunReviewItemNotFoundError(FileNotFoundError):
    pass


class RunManager:
    def __init__(
        self,
        settings: Settings,
        service_factory: Callable[[], ScreeningService],
        project_status_callback: Callable[[str, str, str | None], None] | None = None,
    ) -> None:
        self._settings = settings
        self._service_factory = service_factory
        self._project_status_callback = project_status_callback
        self._lock = threading.Lock()
        # active_runs: (run_id, slot) tuples — one model can be active independently of its sibling
        self._active_workers: set[tuple[str, ModelSlotLiteral]] = set()
        self._runs_dir = settings.runs_dir.resolve()
        self._runs_dir.mkdir(parents=True, exist_ok=True)

    # ---------------------------------------------------------------- public API

    def prepare_run(
        self,
        *,
        request: PreparedRunRequest,
        studies: list[StudyRecord],
        import_summary: ImportSummary,
    ) -> PreparedRunResponse:
        run_id = f"run_{datetime.now(UTC).strftime('%Y%m%d_%H%M%S')}_{uuid4().hex[:8]}"
        run_dir = self._run_dir(run_id)
        run_dir.mkdir(parents=True, exist_ok=False)
        (run_dir / "exports").mkdir(parents=True, exist_ok=True)

        empty_counts = lambda: RunCounts(
            total=len(studies),
            completed=0,
            yes=0,
            no=0,
            maybe=0,
            errors=0,
            pending=len(studies),
        )
        state = PersistedRunState(
            run_id=run_id,
            project_id=request.project_id,
            project_name=request.project_name,
            model_a=request.model_a,
            model_b=request.model_b,
            status_a="prepared",
            status_b="prepared",
            created_at=_utc_now(),
            import_summary=import_summary,
            counts_a=empty_counts(),
            counts_b=empty_counts(),
            inclusion_criteria=request.inclusion_criteria,
            exclusion_criteria=request.exclusion_criteria,
        )

        self._write_state(state)
        self._write_studies(run_id, studies)
        for slot in SLOTS:
            self._init_jsonl(self._results_jsonl_path(run_id, slot))
            self._init_jsonl(self._errors_jsonl_path(run_id, slot))
        self._init_review_csv(run_id)

        return PreparedRunResponse(
            run_id=run_id,
            project_name=state.project_name,
            model_a=state.model_a,
            model_b=state.model_b,
            status=state.overall_status,
            import_summary=state.import_summary,
            counts_a=state.counts_a,
            counts_b=state.counts_b,
        )

    def start_run(self, run_id: str) -> StartRunResponse:
        """Start (or restart) both models. Each model is independent — failed/prepared slots are kicked off."""
        with self._lock:
            state = self._load_state(run_id)
            for slot in SLOTS:
                self._maybe_start_slot(state, slot)
            state = self._load_state(run_id)
        self._notify_project_status(state.project_id, _project_status(state), state.run_id)
        return StartRunResponse(
            run_id=run_id,
            status=state.overall_status,
            message="Run started.",
        )

    def resume_model(self, run_id: str, slot: ModelSlotLiteral) -> StartRunResponse:
        """Resume only one model — its sibling is untouched."""
        if slot not in SLOTS:
            raise ValueError(f"Invalid slot: {slot}")
        with self._lock:
            state = self._load_state(run_id)
            self._maybe_start_slot(state, slot, force_resume=True)
            state = self._load_state(run_id)
        self._notify_project_status(state.project_id, _project_status(state), state.run_id)
        return StartRunResponse(
            run_id=run_id,
            status=state.overall_status,
            message=f"Model {slot.upper()} resumed.",
        )

    def resume_incomplete_runs(self) -> None:
        for run_dir in self._runs_dir.iterdir():
            if not run_dir.is_dir():
                continue
            try:
                state = self._load_state(run_dir.name)
            except RunNotFoundError:
                continue
            for slot in SLOTS:
                if _slot_status(state, slot) == "running":
                    # Worker died with the process — restart it from where the JSONL leaves off.
                    with self._lock:
                        self._maybe_start_slot(state, slot, force_resume=True)

    def get_status(self, run_id: str, *, after_index: int = 0) -> RunStatusResponse:
        with self._lock:
            state = self._load_state(run_id)
            studies = self._load_studies(run_id)
            results_a = self._load_model_results(run_id, "a")
            results_b = self._load_model_results(run_id, "b")

        previews, total_completed = self._build_previews(studies, results_a, results_b, after_index=after_index)
        progress_a = _percent(state.counts_a.completed, state.counts_a.total)
        progress_b = _percent(state.counts_b.completed, state.counts_b.total)

        return RunStatusResponse(
            run_id=state.run_id,
            project_name=state.project_name,
            model_a=state.model_a,
            model_b=state.model_b,
            status=state.overall_status,
            status_a=state.status_a,
            status_b=state.status_b,
            import_summary=state.import_summary,
            counts_a=state.counts_a,
            counts_b=state.counts_b,
            progress_percent_a=progress_a,
            progress_percent_b=progress_b,
            created_at=state.created_at,
            started_at=state.started_at,
            completed_at=state.completed_at,
            started_at_a=state.started_at_a,
            completed_at_a=state.completed_at_a,
            last_error_a=state.last_error_a,
            started_at_b=state.started_at_b,
            completed_at_b=state.completed_at_b,
            last_error_b=state.last_error_b,
            results_xlsx_url_a=f"/api/runs/{run_id}/results/a.xlsx",
            results_xlsx_url_b=f"/api/runs/{run_id}/results/b.xlsx",
            results_xlsx_url_combined=f"/api/runs/{run_id}/results/combined.xlsx",
            errors_ris_url_a=f"/api/runs/{run_id}/errors/a.ris",
            errors_ris_url_b=f"/api/runs/{run_id}/errors/b.ris",
            result_count=total_completed,
            new_results=previews,
        )

    def get_review_workspace(self, run_id: str) -> ReviewWorkspaceResponse:
        state = self._load_state(run_id)
        studies = self._load_studies(run_id)
        results_a = self._load_model_results(run_id, "a")
        results_b = self._load_model_results(run_id, "b")
        review_map = self._load_review_map(run_id)

        items: list[ReviewItem] = []
        for index, study in enumerate(studies, start=1):
            row_a = results_a.get(study.source_id)
            row_b = results_b.get(study.source_id)
            judgment_a = row_a.final_judgment if row_a and row_a.status == "done" else None
            judgment_b = row_b.final_judgment if row_b and row_b.status == "done" else None
            review = review_map.get(study.source_id, {})
            items.append(
                ReviewItem(
                    item_id=study.source_id,
                    sequence=index,
                    source_id=study.source_id,
                    title=study.title,
                    abstract=study.abstract,
                    doi=study.doi,
                    year=study.year,
                    journal=study.journal,
                    source_files=study.source_files,
                    import_filename=f"{run_id}_results_combined.xlsx",
                    linked_run_id=run_id,
                    ris_entry=study.ris_entry,
                    ris_source_filename=study.source_files[0] if study.source_files else None,
                    judgment_a=judgment_a,
                    reason_a=row_a.final_reason if row_a else "",
                    criterion_results_a=row_a.criterion_results if row_a else None,
                    judgment_b=judgment_b,
                    reason_b=row_b.final_reason if row_b else "",
                    criterion_results_b=row_b.criterion_results if row_b else None,
                    consensus=compute_consensus(judgment_a, judgment_b),
                    human_judgment=_normalize_optional_judgment(review.get("human_judgment")),
                    human_reason=review.get("human_reason") or "",
                    reviewed_at=review.get("reviewed_at") or None,
                )
            )

        counts = _build_review_counts(items)
        return ReviewWorkspaceResponse(
            run_id=state.run_id,
            project_name=state.project_name,
            model_a=state.model_a,
            model_b=state.model_b,
            counts=counts,
            items=items,
        )

    def save_human_review(
        self,
        run_id: str,
        source_id: str,
        request: HumanReviewUpdateRequest,
    ) -> ReviewItem:
        workspace = self.get_review_workspace(run_id)
        target = next((item for item in workspace.items if item.source_id == source_id), None)
        if target is None:
            raise RunReviewItemNotFoundError(source_id)

        review_map = self._load_review_map(run_id)
        review_map[source_id] = {
            "source_id": source_id,
            "human_judgment": request.judgment or "",
            "human_reason": request.reason,
            "reviewed_at": _utc_now() if request.judgment or request.reason else "",
        }
        self._write_review_map(run_id, review_map)

        target.human_judgment = request.judgment
        target.human_reason = request.reason
        target.reviewed_at = review_map[source_id]["reviewed_at"] or None
        return target

    # exports ---------------------------------------------------------------

    def get_results_xlsx_path(self, run_id: str, slot: ModelSlotLiteral | None = None) -> Path:
        state = self._load_state(run_id)
        path = self._exports_dir(run_id) / (
            f"results_{slot}.xlsx" if slot else "results_combined.xlsx"
        )
        if slot is None:
            self._build_combined_xlsx(state, path)
        else:
            if slot not in SLOTS:
                raise ValueError(f"Invalid slot: {slot}")
            self._build_single_model_xlsx(state, slot, path)
        return path

    def get_errors_ris_path(self, run_id: str, slot: ModelSlotLiteral) -> Path:
        if slot not in SLOTS:
            raise ValueError(f"Invalid slot: {slot}")
        path = self._exports_dir(run_id) / f"errors_{slot}.ris"
        self._build_errors_ris_export(run_id, slot, path)
        if not path.exists():
            raise RunExportEmptyError(run_id)
        return path

    # ---------------------------------------------------------------- internals

    def _maybe_start_slot(
        self,
        state: PersistedRunState,
        slot: ModelSlotLiteral,
        *,
        force_resume: bool = False,
    ) -> None:
        key = (state.run_id, slot)
        if key in self._active_workers:
            return
        slot_status = _slot_status(state, slot)
        if slot_status == "completed" and not force_resume:
            return
        # Anything pending or failed is fair game.
        new_status = "running"
        if slot == "a":
            state.status_a = new_status
            state.started_at_a = state.started_at_a or _utc_now()
            state.last_error_a = None
            state.completed_at_a = None
        else:
            state.status_b = new_status
            state.started_at_b = state.started_at_b or _utc_now()
            state.last_error_b = None
            state.completed_at_b = None
        if state.started_at is None:
            state.started_at = _utc_now()
        state.completed_at = None
        self._write_state(state)
        self._active_workers.add(key)
        threading.Thread(target=self._process_model, args=(state.run_id, slot), daemon=True).start()

    def _process_model(self, run_id: str, slot: ModelSlotLiteral) -> None:
        try:
            state = self._load_state(run_id)
            studies = self._load_studies(run_id)
            existing = self._load_model_results(run_id, slot)
            # Pending: never run before, OR previously failed (latest record is failed).
            pending_studies = [
                study for study in studies
                if existing.get(study.source_id) is None or existing[study.source_id].status == "failed"
            ]

            if not pending_studies:
                self._finalize_slot(run_id, slot, error=None)
                return

            with ThreadPoolExecutor(max_workers=self._settings.max_concurrency) as executor:
                futures = {
                    executor.submit(self._screen_one, state, slot, study): study
                    for study in pending_studies
                }
                for future in as_completed(futures):
                    study = futures[future]
                    row, error = future.result()
                    self._append_model_result(run_id, slot, row)
                    if error:
                        self._append_error_record(run_id, slot, study, error)
                    self._refresh_counts_for_slot(run_id, slot)

            self._finalize_slot(run_id, slot, error=None)
        except Exception as exc:
            self._finalize_slot(run_id, slot, error=str(exc))
        finally:
            with self._lock:
                self._active_workers.discard((run_id, slot))

    def _screen_one(
        self,
        state: PersistedRunState,
        slot: ModelSlotLiteral,
        study: StudyRecord,
    ) -> tuple[ModelRowResult, str | None]:
        service = self._service_factory()
        model = state.model_a if slot == "a" else state.model_b
        last_error: str | None = None
        for attempt in range(1, self._settings.max_retries + 1):
            try:
                response = service.screen(
                    ScreeningRequest(
                        title=study.title,
                        abstract=study.abstract,
                        inclusion_criteria=state.inclusion_criteria,
                        exclusion_criteria=state.exclusion_criteria,
                    ),
                    model_override=model,
                )
                return (
                    ModelRowResult(
                        source_id=study.source_id,
                        model=model,
                        final_judgment=response.final_decision.judgment,
                        final_reason=response.final_decision.reason,
                        criterion_results=response.criteria_results,
                        raw_model_output=response.raw_model_output,
                        status="done",
                        attempt=attempt,
                        updated_at=_utc_now(),
                    ),
                    None,
                )
            except Exception as exc:
                last_error = str(exc)
                if attempt < self._settings.max_retries:
                    time.sleep(2**attempt)

        failed = ModelRowResult(
            source_id=study.source_id,
            model=model,
            final_judgment="maybe",
            final_reason=f"Model call failed after {self._settings.max_retries} attempts: {last_error}",
            criterion_results=CriteriaResults(
                inclusion=_fallback_criterion_results(state.inclusion_criteria),
                exclusion=_fallback_criterion_results(state.exclusion_criteria),
            ),
            raw_model_output=last_error or "Model call failed with no error message.",
            status="failed",
            error=last_error,
            attempt=self._settings.max_retries,
            updated_at=_utc_now(),
        )
        return failed, last_error

    def _finalize_slot(self, run_id: str, slot: ModelSlotLiteral, *, error: str | None) -> None:
        with self._lock:
            state = self._load_state(run_id)
            now = _utc_now()
            if error:
                if slot == "a":
                    state.status_a = "failed"
                    state.last_error_a = error
                else:
                    state.status_b = "failed"
                    state.last_error_b = error
            else:
                # Determine completed vs failed based on whether any rows are still failed.
                results = self._load_model_results(run_id, slot)
                has_failed = any(row.status == "failed" for row in results.values())
                final_status = "failed" if has_failed else "completed"
                if slot == "a":
                    state.status_a = final_status
                    state.completed_at_a = now
                else:
                    state.status_b = final_status
                    state.completed_at_b = now
            if state.status_a in ("completed", "failed", "cancelled") and state.status_b in (
                "completed",
                "failed",
                "cancelled",
            ):
                state.completed_at = now
            self._write_state(state)
        self._notify_project_status(state.project_id, _project_status(state), state.run_id)

    def _refresh_counts_for_slot(self, run_id: str, slot: ModelSlotLiteral) -> None:
        with self._lock:
            state = self._load_state(run_id)
            results = self._load_model_results(run_id, slot)
            counts = _counts_from_results(state.counts_a.total if slot == "a" else state.counts_b.total, results)
            if slot == "a":
                state.counts_a = counts
            else:
                state.counts_b = counts
            self._write_state(state)

    # storage -----------------------------------------------------------------

    def _init_jsonl(self, path: Path) -> None:
        path.write_text("", encoding="utf-8")

    def _init_review_csv(self, run_id: str) -> None:
        with self._review_csv_path(run_id).open("w", newline="", encoding="utf-8") as handle:
            csv.writer(handle).writerow(REVIEW_HEADERS)

    def _append_model_result(self, run_id: str, slot: ModelSlotLiteral, row: ModelRowResult) -> None:
        path = self._results_jsonl_path(run_id, slot)
        # No lock needed for append-on-different-files; OS append is atomic for small writes.
        with path.open("a", encoding="utf-8") as handle:
            handle.write(row.model_dump_json() + "\n")
            handle.flush()

    def _append_error_record(
        self,
        run_id: str,
        slot: ModelSlotLiteral,
        study: StudyRecord,
        error: str,
    ) -> None:
        path = self._errors_jsonl_path(run_id, slot)
        record = {
            "source_id": study.source_id,
            "title": study.title,
            "attempts": self._settings.max_retries,
            "error": error,
            "updated_at": _utc_now(),
        }
        with path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(record, ensure_ascii=False) + "\n")
            handle.flush()

    def _load_model_results(self, run_id: str, slot: ModelSlotLiteral) -> dict[str, ModelRowResult]:
        path = self._results_jsonl_path(run_id, slot)
        if not path.exists():
            return {}
        latest: dict[str, ModelRowResult] = {}
        for line in path.read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            try:
                row = ModelRowResult.model_validate_json(line)
            except Exception:
                continue
            existing = latest.get(row.source_id)
            if existing is None or row.updated_at >= existing.updated_at:
                latest[row.source_id] = row
        return latest

    def _load_error_records(self, run_id: str, slot: ModelSlotLiteral) -> list[dict[str, str]]:
        path = self._errors_jsonl_path(run_id, slot)
        if not path.exists():
            return []
        # Latest error per source_id wins.
        latest: dict[str, dict[str, str]] = {}
        for line in path.read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            try:
                payload = json.loads(line)
            except json.JSONDecodeError:
                continue
            if not isinstance(payload, dict):
                continue
            sid = str(payload.get("source_id") or "").strip()
            if sid:
                latest[sid] = {
                    "source_id": sid,
                    "title": str(payload.get("title") or ""),
                    "attempts": str(payload.get("attempts") or ""),
                    "error": str(payload.get("error") or ""),
                }
        # Drop errors that have since succeeded.
        results = self._load_model_results(run_id, slot)
        return [rec for sid, rec in latest.items() if results.get(sid) is None or results[sid].status == "failed"]

    def _write_studies(self, run_id: str, studies: list[StudyRecord]) -> None:
        path = self._studies_path(run_id)
        payload = "\n".join(json.dumps(study.model_dump(), ensure_ascii=False) for study in studies)
        path.write_text(payload, encoding="utf-8")

    def _load_studies(self, run_id: str) -> list[StudyRecord]:
        path = self._studies_path(run_id)
        if not path.exists():
            raise RunNotFoundError(run_id)
        lines = [line for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
        return [StudyRecord.model_validate_json(line) for line in lines]

    def _load_review_map(self, run_id: str) -> dict[str, dict[str, str]]:
        path = self._review_csv_path(run_id)
        if not path.exists():
            return {}
        with path.open("r", newline="", encoding="utf-8") as handle:
            reader = csv.DictReader(handle)
            return {row["source_id"]: row for row in reader if row.get("source_id")}

    def _write_review_map(self, run_id: str, review_map: dict[str, dict[str, str]]) -> None:
        path = self._review_csv_path(run_id)
        with path.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(handle, fieldnames=REVIEW_HEADERS)
            writer.writeheader()
            for source_id in sorted(review_map):
                writer.writerow(
                    {
                        "source_id": source_id,
                        "human_judgment": review_map[source_id].get("human_judgment") or "",
                        "human_reason": review_map[source_id].get("human_reason") or "",
                        "reviewed_at": review_map[source_id].get("reviewed_at") or "",
                    }
                )

    def _write_state(self, state: PersistedRunState) -> None:
        path = self._state_path(state.run_id)
        path.write_text(state.model_dump_json(indent=2), encoding="utf-8")

    def _load_state(self, run_id: str) -> PersistedRunState:
        path = self._state_path(run_id)
        if not path.exists():
            raise RunNotFoundError(run_id)
        return PersistedRunState.model_validate_json(path.read_text(encoding="utf-8"))

    # exports -----------------------------------------------------------------

    def _build_single_model_xlsx(self, state: PersistedRunState, slot: ModelSlotLiteral, dest: Path) -> None:
        results = self._load_model_results(state.run_id, slot)
        studies = self._load_studies(state.run_id)
        model_name = state.model_a if slot == "a" else state.model_b

        headers = [
            "source_id", "title", "abstract", "doi", "year", "journal", "source_files",
            "model", "final_judgment", "final_reason", "status", "error", "attempt", "updated_at",
            "raw_model_output",
        ]
        headers.extend(_criterion_headers(state.inclusion_criteria, "inclusion"))
        headers.extend(_criterion_headers(state.exclusion_criteria, "exclusion"))

        workbook = Workbook()
        worksheet = workbook.active
        worksheet.title = f"Model {slot.upper()}"
        worksheet.append(headers)

        for study in studies:
            row = results.get(study.source_id)
            base = [
                study.source_id, study.title, study.abstract,
                study.doi or "", study.year or "", study.journal or "",
                " | ".join(study.source_files),
                model_name,
                row.final_judgment if row else "",
                row.final_reason if row else "",
                row.status if row else "pending",
                (row.error or "") if row else "",
                row.attempt if row else "",
                row.updated_at if row else "",
                row.raw_model_output if row else "",
            ]
            inc_results = row.criterion_results.inclusion if row else []
            exc_results = row.criterion_results.exclusion if row else []
            base.extend(_criterion_values(state.inclusion_criteria, inc_results))
            base.extend(_criterion_values(state.exclusion_criteria, exc_results))
            worksheet.append(base)

        workbook.save(dest)

    def _build_combined_xlsx(self, state: PersistedRunState, dest: Path) -> None:
        studies = self._load_studies(state.run_id)
        results_a = self._load_model_results(state.run_id, "a")
        results_b = self._load_model_results(state.run_id, "b")
        review_map = self._load_review_map(state.run_id)

        headers = [
            "source_id", "title", "abstract", "doi", "year", "journal", "source_files",
            "model_a", "judgment_a", "reason_a", "status_a",
            "model_b", "judgment_b", "reason_b", "status_b",
            "consensus",
            "human_judgment", "human_reason", "reviewed_at",
        ]
        workbook = Workbook()
        worksheet = workbook.active
        worksheet.title = "Combined"
        worksheet.append(headers)

        for study in studies:
            row_a = results_a.get(study.source_id)
            row_b = results_b.get(study.source_id)
            j_a = row_a.final_judgment if row_a and row_a.status == "done" else None
            j_b = row_b.final_judgment if row_b and row_b.status == "done" else None
            review = review_map.get(study.source_id, {})
            worksheet.append([
                study.source_id, study.title, study.abstract,
                study.doi or "", study.year or "", study.journal or "",
                " | ".join(study.source_files),
                state.model_a,
                row_a.final_judgment if row_a else "", row_a.final_reason if row_a else "",
                row_a.status if row_a else "pending",
                state.model_b,
                row_b.final_judgment if row_b else "", row_b.final_reason if row_b else "",
                row_b.status if row_b else "pending",
                compute_consensus(j_a, j_b),
                review.get("human_judgment") or "",
                review.get("human_reason") or "",
                review.get("reviewed_at") or "",
            ])

        workbook.save(dest)

    def _build_errors_ris_export(self, run_id: str, slot: ModelSlotLiteral, dest: Path) -> None:
        error_records = self._load_error_records(run_id, slot)
        if not error_records:
            if dest.exists():
                dest.unlink()
            return
        studies_by_id = {study.source_id: study for study in self._load_studies(run_id)}
        records: list[str] = []
        for rec in error_records:
            study = studies_by_id.get(rec["source_id"])
            if study is None:
                continue
            records.append("\n".join(_study_to_ris_lines(study)))
        if not records:
            if dest.exists():
                dest.unlink()
            return
        dest.write_text("\n\n".join(records) + "\n", encoding="utf-8")

    # path helpers ------------------------------------------------------------

    def _build_previews(
        self,
        studies: list[StudyRecord],
        results_a: dict[str, ModelRowResult],
        results_b: dict[str, ModelRowResult],
        *,
        after_index: int,
    ) -> tuple[list[RunResultPreview], int]:
        """Return a preview for every study with model activity.

        Each row's state can transition multiple times (A first, then B; a
        failed row resumed; etc.), so position-based pagination is unreliable.
        We emit all active rows on every poll and rely on the client merging
        by sequence — re-sending identical rows is a cheap idempotent no-op
        at desktop-app scale.
        """
        del after_index  # kept for API stability; no longer used for filtering
        previews: list[RunResultPreview] = []
        for index, study in enumerate(studies, start=1):
            row_a = results_a.get(study.source_id)
            row_b = results_b.get(study.source_id)
            if row_a is None and row_b is None:
                continue
            j_a: JudgmentLiteral | None = row_a.final_judgment if row_a and row_a.status == "done" else None
            j_b: JudgmentLiteral | None = row_b.final_judgment if row_b and row_b.status == "done" else None
            previews.append(
                RunResultPreview(
                    sequence=index,
                    source_id=study.source_id,
                    title=study.title,
                    doi=study.doi,
                    year=study.year,
                    journal=study.journal,
                    judgment_a=j_a,
                    judgment_b=j_b,
                    consensus=compute_consensus(j_a, j_b),
                )
            )
        return previews, len(previews)

    def _run_dir(self, run_id: str) -> Path:
        return self._runs_dir / run_id

    def _exports_dir(self, run_id: str) -> Path:
        path = self._run_dir(run_id) / "exports"
        path.mkdir(parents=True, exist_ok=True)
        return path

    def _state_path(self, run_id: str) -> Path:
        return self._run_dir(run_id) / "state.json"

    def _studies_path(self, run_id: str) -> Path:
        return self._run_dir(run_id) / "studies.jsonl"

    def _results_jsonl_path(self, run_id: str, slot: ModelSlotLiteral) -> Path:
        return self._run_dir(run_id) / f"results_{slot}.jsonl"

    def _errors_jsonl_path(self, run_id: str, slot: ModelSlotLiteral) -> Path:
        return self._run_dir(run_id) / f"errors_{slot}.jsonl"

    def _review_csv_path(self, run_id: str) -> Path:
        return self._run_dir(run_id) / "review.csv"

    def _notify_project_status(
        self,
        project_id: str | None,
        status: str,
        latest_run_id: str | None,
    ) -> None:
        if not project_id or self._project_status_callback is None:
            return
        self._project_status_callback(project_id, status, latest_run_id)


# ---------------------------------------------------------------- module helpers

def _slot_status(state: PersistedRunState, slot: ModelSlotLiteral) -> str:
    return state.status_a if slot == "a" else state.status_b


def _project_status(state: PersistedRunState) -> str:
    overall = state.overall_status
    if overall in ("running", "completed", "failed"):
        return overall
    return "running"


def _percent(completed: int, total: int) -> float:
    if total <= 0:
        return 0.0
    return round((completed / total) * 100, 2)


def _counts_from_results(total: int, results: dict[str, ModelRowResult]) -> RunCounts:
    completed = len(results)
    yes = sum(1 for r in results.values() if r.status == "done" and r.final_judgment == "yes")
    no = sum(1 for r in results.values() if r.status == "done" and r.final_judgment == "no")
    maybe = sum(1 for r in results.values() if r.status == "done" and r.final_judgment == "maybe")
    errors = sum(1 for r in results.values() if r.status == "failed")
    return RunCounts(
        total=total,
        completed=completed,
        yes=yes,
        no=no,
        maybe=maybe,
        errors=errors,
        pending=max(total - completed, 0),
    )


def _build_review_counts(items: list[ReviewItem]) -> ReviewCounts:
    needs_review_items = [item for item in items if _requires_human_review(item)]
    return ReviewCounts(
        total=len(items),
        consensus_agree=sum(1 for item in items if item.consensus == "agree"),
        consensus_partial=sum(1 for item in items if item.consensus == "partial"),
        consensus_conflict=sum(1 for item in items if item.consensus == "conflict"),
        consensus_pending=sum(1 for item in items if item.consensus == "pending"),
        reviewed=sum(1 for item in items if item.human_judgment is not None),
        needs_review_total=len(needs_review_items),
        needs_review_reviewed=sum(1 for item in needs_review_items if item.human_judgment is not None),
        human_yes=sum(1 for item in items if item.human_judgment == "yes"),
        human_no=sum(1 for item in items if item.human_judgment == "no"),
        human_maybe=sum(1 for item in items if item.human_judgment == "maybe"),
    )


def _requires_human_review(item: ReviewItem) -> bool:
    return not (
        (item.judgment_a == "yes" and item.judgment_b == "yes")
        or (item.judgment_a == "no" and item.judgment_b == "no")
    )


def _fallback_criterion_results(criteria: list[CriterionInput]) -> list[CriterionResult]:
    return [
        CriterionResult(
            id=item.id,
            text=item.text,
            judgment="maybe",
            reason="Model call failed before criterion-level evaluation.",
        )
        for item in criteria
    ]


def _criterion_headers(criteria: list[CriterionInput], group: str) -> list[str]:
    headers: list[str] = []
    for item in criteria:
        token = _safe_column_token(item.id)
        headers.append(f"{group}_{token}_judgment")
        headers.append(f"{group}_{token}_reason")
    return headers


def _criterion_values(criteria: list[CriterionInput], actual: Iterable[CriterionResult]) -> list[str]:
    by_id = {item.id: item for item in actual}
    values: list[str] = []
    for criterion in criteria:
        result = by_id.get(criterion.id)
        values.append(result.judgment if result else "")
        values.append(result.reason if result else "")
    return values


def _safe_column_token(value: str) -> str:
    token = "".join(char if char.isalnum() else "_" for char in value.strip())
    token = token.strip("_")
    return token or "criterion"


def _utc_now() -> str:
    return datetime.now(UTC).isoformat()


def _normalize_optional_judgment(value: object) -> JudgmentLiteral | None:
    token = str(value or "").strip().lower()
    if token in {"yes", "no", "maybe"}:
        return token  # type: ignore[return-value]
    return None


def _study_to_ris_lines(study: StudyRecord) -> list[str]:
    lines = ["TY  - JOUR", f"ID  - {_ris_safe(study.source_id)}", f"TI  - {_ris_safe(study.title)}"]
    for author in study.authors:
        lines.append(f"AU  - {_ris_safe(author)}")
    if study.year:
        lines.append(f"PY  - {_ris_safe(study.year)}")
    if study.journal:
        lines.append(f"JO  - {_ris_safe(study.journal)}")
    if study.doi:
        lines.append(f"DO  - {_ris_safe(study.doi)}")
    lines.append(f"AB  - {_ris_safe(study.abstract)}")
    lines.append("ER  -")
    return lines


def _ris_safe(value: str) -> str:
    return " ".join(value.replace("\r", " ").replace("\n", " ").split())
