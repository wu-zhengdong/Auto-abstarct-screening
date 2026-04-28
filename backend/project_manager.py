import json
import shutil
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from backend.config import Settings
from backend.models import (
    ImportSummary,
    ProjectCreateRequest,
    ProjectCriteriaUpdateRequest,
    ProjectDetail,
    ProjectImportResponse,
    ProjectStatusLiteral,
    ProjectSummary,
    ProjectUpdateRequest,
    StudyRecord,
)


class ProjectNotFoundError(FileNotFoundError):
    pass


class ProjectExportEmptyError(FileNotFoundError):
    pass


class ProjectManager:
    def __init__(self, settings: Settings) -> None:
        self._projects_dir = settings.projects_dir.resolve()
        self._projects_dir.mkdir(parents=True, exist_ok=True)
        self._default_model_a = settings.screening_model_a
        self._default_model_b = settings.screening_model_b

    def list_projects(self) -> list[ProjectSummary]:
        projects: list[ProjectSummary] = []
        for path in sorted(self._projects_dir.iterdir(), reverse=True):
            if not path.is_dir():
                continue
            try:
                detail = self.get_project(path.name)
            except ProjectNotFoundError:
                continue
            projects.append(
                ProjectSummary(
                    project_id=detail.project_id,
                    name=detail.name,
                    description=detail.description,
                    status=detail.status,
                    paper_count=detail.import_summary.deduplicated_count,
                    duplicate_count=detail.import_summary.duplicate_count,
                    created_at=detail.created_at,
                    updated_at=detail.updated_at,
                    latest_run_id=detail.latest_run_id,
                )
            )
        return sorted(projects, key=lambda item: item.updated_at, reverse=True)

    def create_project(self, request: ProjectCreateRequest) -> ProjectDetail:
        project_id = f"proj_{datetime.now(UTC).strftime('%Y%m%d_%H%M%S')}_{uuid4().hex[:8]}"
        model_a = request.model_a or self._default_model_a
        model_b = request.model_b or self._default_model_b
        if model_a == model_b:
            raise ValueError("model_a and model_b must be different.")
        project = ProjectDetail(
            project_id=project_id,
            name=request.name,
            description=request.description,
            status="idle",
            paper_count=0,
            duplicate_count=0,
            created_at=_utc_now(),
            updated_at=_utc_now(),
            model_a=model_a,
            model_b=model_b,
        )
        self._project_dir(project_id).mkdir(parents=True, exist_ok=False)
        self._write_project(project)
        self._write_studies(project_id, [])
        return project

    def get_project(self, project_id: str) -> ProjectDetail:
        path = self._project_json_path(project_id)
        if not path.exists():
            raise ProjectNotFoundError(project_id)
        return ProjectDetail.model_validate_json(path.read_text(encoding="utf-8"))

    def copy_project(self, project_id: str) -> ProjectDetail:
        source = self.get_project(project_id)
        copied = ProjectDetail(
            project_id=f"proj_{datetime.now(UTC).strftime('%Y%m%d_%H%M%S')}_{uuid4().hex[:8]}",
            name=f"{source.name} (Copy)",
            description=source.description,
            status="idle",
            paper_count=0,
            duplicate_count=0,
            created_at=_utc_now(),
            updated_at=_utc_now(),
            latest_run_id=None,
            inclusion_criteria=source.inclusion_criteria,
            exclusion_criteria=source.exclusion_criteria,
            import_summary=ImportSummary(
                file_count=0,
                imported_count=0,
                deduplicated_count=0,
                duplicate_count=0,
            ),
            model_a=source.model_a,
            model_b=source.model_b,
        )
        self._project_dir(copied.project_id).mkdir(parents=True, exist_ok=False)
        self._write_project(copied)
        self._write_studies(copied.project_id, [])
        return copied

    def delete_project(self, project_id: str) -> None:
        project_dir = self._project_dir(project_id)
        if not project_dir.exists():
            raise ProjectNotFoundError(project_id)
        shutil.rmtree(project_dir)

    def update_project(self, project_id: str, request: ProjectUpdateRequest) -> ProjectDetail:
        project = self.get_project(project_id)
        project.name = request.name
        project.description = request.description
        if request.model_a is not None:
            project.model_a = request.model_a
        if request.model_b is not None:
            project.model_b = request.model_b
        if project.model_a == project.model_b:
            raise ValueError("model_a and model_b must be different.")
        project.updated_at = _utc_now()
        self._write_project(project)
        return project

    def save_criteria(self, project_id: str, request: ProjectCriteriaUpdateRequest) -> ProjectDetail:
        project = self.get_project(project_id)
        project.inclusion_criteria = request.inclusion_criteria
        project.exclusion_criteria = request.exclusion_criteria
        project.updated_at = _utc_now()
        self._write_project(project)
        return project

    def save_imported_studies(
        self,
        project_id: str,
        studies: list[StudyRecord],
        summary: ImportSummary,
    ) -> ProjectImportResponse:
        project = self.get_project(project_id)
        project.import_summary = summary
        project.paper_count = summary.deduplicated_count
        project.duplicate_count = summary.duplicate_count
        project.updated_at = _utc_now()
        self._write_project(project)
        self._write_studies(project_id, studies)
        return ProjectImportResponse(
            project_id=project_id,
            import_summary=summary,
        )

    def append_imported_studies(
        self,
        project_id: str,
        new_studies: list[StudyRecord],
        new_summary: ImportSummary,
    ) -> ProjectImportResponse:
        project = self.get_project(project_id)
        existing_studies = self.load_project_studies(project_id)
        existing_summary = project.import_summary

        # If any new filename conflicts with an existing file, drop that file's
        # old contribution first so the re-upload fully replaces it.
        existing_names = set(existing_summary.per_file_imports.keys()) | set(existing_summary.source_filenames)
        conflicting = set(new_summary.per_file_imports.keys()) & existing_names
        if conflicting:
            filtered: list[StudyRecord] = []
            for study in existing_studies:
                remaining = [f for f in study.source_files if f not in conflicting]
                if remaining:
                    filtered.append(study.model_copy(update={"source_files": remaining}))
            existing_studies = filtered

        merged: dict[str, StudyRecord] = {s.dedupe_key: s for s in existing_studies}
        for study in new_studies:
            existing = merged.get(study.dedupe_key)
            if existing is None:
                merged[study.dedupe_key] = study
            else:
                merged_files = sorted({*existing.source_files, *study.source_files})
                merged[study.dedupe_key] = existing.model_copy(update={"source_files": merged_files})
        merged_studies = list(merged.values())

        merged_per_file = {
            name: count
            for name, count in existing_summary.per_file_imports.items()
            if name not in conflicting
        }
        merged_per_file.update(new_summary.per_file_imports)
        source_filenames = list(merged_per_file.keys())
        imported_count = sum(merged_per_file.values())
        deduplicated_count = len(merged_studies)
        summary = ImportSummary(
            file_count=len(source_filenames),
            imported_count=imported_count,
            deduplicated_count=deduplicated_count,
            duplicate_count=max(imported_count - deduplicated_count, 0),
            source_filenames=source_filenames,
            per_file_imports=merged_per_file,
        )
        return self.save_imported_studies(project_id, merged_studies, summary)

    def delete_imported_source(
        self,
        project_id: str,
        filename: str,
    ) -> ProjectImportResponse:
        project = self.get_project(project_id)
        existing_summary = project.import_summary
        if filename not in existing_summary.per_file_imports and filename not in existing_summary.source_filenames:
            raise ValueError(f"Imported file not found: {filename}")

        existing_studies = self.load_project_studies(project_id)
        kept: list[StudyRecord] = []
        for study in existing_studies:
            remaining = [f for f in study.source_files if f != filename]
            if remaining:
                kept.append(study.model_copy(update={"source_files": remaining}))

        per_file = dict(existing_summary.per_file_imports)
        per_file.pop(filename, None)
        source_filenames = [name for name in existing_summary.source_filenames if name != filename]
        # Keep per_file keys aligned with source_filenames for legacy records.
        source_filenames = list(dict.fromkeys([*per_file.keys(), *source_filenames]))
        imported_count = sum(per_file.values()) if per_file else len(kept)
        deduplicated_count = len(kept)
        summary = ImportSummary(
            file_count=len(source_filenames),
            imported_count=imported_count,
            deduplicated_count=deduplicated_count,
            duplicate_count=max(imported_count - deduplicated_count, 0),
            source_filenames=source_filenames,
            per_file_imports=per_file,
        )
        return self.save_imported_studies(project_id, kept, summary)

    def load_project_studies(self, project_id: str) -> list[StudyRecord]:
        path = self._studies_path(project_id)
        if not path.exists():
            raise ProjectNotFoundError(project_id)
        lines = [line for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
        return [StudyRecord.model_validate_json(line) for line in lines]

    def get_deduplicated_ris_path(self, project_id: str) -> Path:
        studies = self.load_project_studies(project_id)
        if not studies:
            raise ProjectExportEmptyError(project_id)
        path = self._deduplicated_ris_path(project_id)
        entries = [_study_to_ris_entry(study) for study in studies]
        path.write_text("\n\n".join(entries) + "\n", encoding="utf-8")
        return path

    def set_project_run_status(
        self,
        project_id: str,
        *,
        status: ProjectStatusLiteral,
        latest_run_id: str | None = None,
    ) -> None:
        project = self.get_project(project_id)
        project.status = status
        if latest_run_id is not None:
            project.latest_run_id = latest_run_id
        project.updated_at = _utc_now()
        self._write_project(project)

    def _write_project(self, project: ProjectDetail) -> None:
        self._project_json_path(project.project_id).write_text(
            project.model_dump_json(indent=2),
            encoding="utf-8",
        )

    def _write_studies(self, project_id: str, studies: list[StudyRecord]) -> None:
        path = self._studies_path(project_id)
        payload = "\n".join(json.dumps(study.model_dump(), ensure_ascii=False) for study in studies)
        path.write_text(payload, encoding="utf-8")

    def _project_dir(self, project_id: str) -> Path:
        return self._projects_dir / project_id

    def _project_json_path(self, project_id: str) -> Path:
        return self._project_dir(project_id) / "project.json"

    def _studies_path(self, project_id: str) -> Path:
        return self._project_dir(project_id) / "studies.jsonl"

    def _deduplicated_ris_path(self, project_id: str) -> Path:
        return self._project_dir(project_id) / "deduplicated.ris"


def _utc_now() -> str:
    return datetime.now(UTC).isoformat()


def _study_to_ris_entry(study: StudyRecord) -> str:
    if study.ris_entry and study.ris_entry.strip():
        return _normalize_ris_entry(study.ris_entry)

    lines = ["TY  - JOUR", f"ID  - {_ris_safe(study.source_id)}", f"TI  - {_ris_safe(study.title)}"]
    for author in study.authors:
        lines.append(f"AU  - {_ris_safe(author)}")
    if study.year:
        lines.append(f"PY  - {_ris_safe(study.year)}")
    if study.journal:
        lines.append(f"JO  - {_ris_safe(study.journal)}")
    if study.doi:
        lines.append(f"DO  - {_ris_safe(study.doi)}")
    if study.abstract:
        lines.append(f"AB  - {_ris_safe(study.abstract)}")
    lines.append("ER  -")
    return "\n".join(lines)


def _normalize_ris_entry(value: str) -> str:
    cleaned = value.strip()
    if "ER  -" not in cleaned:
        cleaned = f"{cleaned}\nER  -"
    return cleaned


def _ris_safe(value: str) -> str:
    return " ".join(value.replace("\r", " ").replace("\n", " ").split())
