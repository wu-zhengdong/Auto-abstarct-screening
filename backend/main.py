from contextlib import asynccontextmanager
from functools import lru_cache
from pathlib import Path
import sys

from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, RedirectResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from backend.app_settings import PROVIDER_LABELS, UserSettingsStore, model_provider
from backend.config import SELECTABLE_SCREENING_MODELS, SUPPORTED_SCREENING_MODELS, get_settings
from backend.ingestion import load_ris_studies
from backend.llm import LLMOutputError, QwenScreeningClient, test_api_key
from backend.models import (
    ApiKeySaveRequest,
    ApiKeySaveResponse,
    ApiKeyStatusResponse,
    HumanReviewUpdateRequest,
    PreparedRunRequest,
    ProjectCreateRequest,
    ProjectCriteriaUpdateRequest,
    ProjectListResponse,
    ProjectUpdateRequest,
    ReviewProjectListResponse,
    ReviewProjectUpdateRequest,
    ScreeningRequest,
    ScreeningResponse,
)
from backend.project_manager import ProjectExportEmptyError, ProjectManager, ProjectNotFoundError
from backend.review_manager import (
    ReviewFileFormatError,
    ReviewItemNotFoundError,
    ReviewManager,
    ReviewProjectNotFoundError,
    ReviewRisExportError,
)
from backend.run_manager import RunExportEmptyError, RunManager, RunNotFoundError, RunReviewItemNotFoundError
from backend.service import ScreeningService


@lru_cache(maxsize=1)
def get_llm_client() -> QwenScreeningClient:
    settings = get_settings()
    return QwenScreeningClient(settings)


@lru_cache(maxsize=1)
def get_service() -> ScreeningService:
    return ScreeningService(get_llm_client())


@lru_cache(maxsize=1)
def get_project_manager() -> ProjectManager:
    return ProjectManager(get_settings())


@lru_cache(maxsize=1)
def get_run_manager() -> RunManager:
    return RunManager(
        get_settings(),
        get_service,
        project_status_callback=lambda project_id, status, latest_run_id: get_project_manager().set_project_run_status(
            project_id,
            status=status,
            latest_run_id=latest_run_id,
        ),
    )


@lru_cache(maxsize=1)
def get_review_manager() -> ReviewManager:
    return ReviewManager(get_settings())


def get_user_settings_store() -> UserSettingsStore:
    return UserSettingsStore()


def create_app() -> FastAPI:
    root_dir = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent.parent))
    templates = Jinja2Templates(directory=str(root_dir / "templates"))

    def asset_version() -> str:
        static_dir = root_dir / "static"
        candidates = ("styles.css", "home.js", "project.js", "review.js")
        try:
            latest_mtime = max((static_dir / name).stat().st_mtime_ns for name in candidates)
        except OSError:
            return "dev"
        return str(latest_mtime)

    project_steps = (
        {"slug": "project", "index": 1, "label": "Project", "description": "Identity and notes."},
        {"slug": "criteria", "index": 2, "label": "Criteria", "description": "Enter inclusion and exclusion rules."},
        {"slug": "import", "index": 3, "label": "Import", "description": "Upload RIS files and deduplicate."},
        {"slug": "run", "index": 4, "label": "Run", "description": "Start screening and track progress."},
    )

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        get_run_manager().resume_incomplete_runs()
        yield

    app = FastAPI(
        title="LLM Abstract Screening Backend",
        version="0.2.0",
        lifespan=lifespan,
    )
    app.mount("/static", StaticFiles(directory=str(root_dir / "static")), name="static")

    @app.get("/favicon.ico", include_in_schema=False)
    def favicon() -> Response:
        return Response(status_code=204)

    @app.get("/")
    def homepage(request: Request):
        return templates.TemplateResponse(
            request=request,
            name="home.html",
            context={
                "default_model_a": get_settings().screening_model_a,
                "default_model_b": get_settings().screening_model_b,
                "available_models": SELECTABLE_SCREENING_MODELS,
                "asset_version": asset_version(),
            },
        )

    @app.get("/review")
    def review_landing():
        return RedirectResponse(url="/", status_code=303)

    @app.get("/review-projects/{project_id}")
    def review_project_page(request: Request, project_id: str):
        try:
            get_review_manager().get_project(project_id)
        except ReviewProjectNotFoundError as exc:
            raise HTTPException(status_code=404, detail="Review project not found.") from exc
        return templates.TemplateResponse(
            request=request,
            name="review_workspace.html",
            context={
                "review_project_id": project_id,
                "asset_version": asset_version(),
            },
        )

    @app.get("/projects/{project_id}")
    def project_landing(project_id: str):
        try:
            project = get_project_manager().get_project(project_id)
        except ProjectNotFoundError as exc:
            raise HTTPException(status_code=404, detail="Project not found.") from exc
        return RedirectResponse(url=f"/projects/{project_id}/{_recommended_step(project)}", status_code=303)

    @app.get("/projects/{project_id}/{step}")
    def project_page(request: Request, project_id: str, step: str):
        step_slugs = {item["slug"] for item in project_steps}
        if step not in step_slugs:
            raise HTTPException(status_code=404, detail="Project step not found.")

        try:
            project = get_project_manager().get_project(project_id)
        except ProjectNotFoundError as exc:
            raise HTTPException(status_code=404, detail="Project not found.") from exc

        step_index = next(index for index, item in enumerate(project_steps) if item["slug"] == step)
        return templates.TemplateResponse(
            request=request,
            name="project_step.html",
            context={
                "default_model_a": get_settings().screening_model_a,
                "default_model_b": get_settings().screening_model_b,
                "available_models": SELECTABLE_SCREENING_MODELS,
                "project_id": project_id,
                "project_name": project.name,
                "asset_version": asset_version(),
                "step": step,
                "steps": [
                    {
                        **item,
                        "href": f"/projects/{project_id}/{item['slug']}",
                        "active": item["slug"] == step,
                    }
                    for item in project_steps
                ],
                "previous_step": project_steps[step_index - 1] if step_index > 0 else None,
                "next_step": project_steps[step_index + 1] if step_index < len(project_steps) - 1 else None,
            },
        )

    @app.get("/health")
    def healthcheck() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/api/settings/api-keys", response_model=ApiKeyStatusResponse)
    def get_api_key_statuses() -> ApiKeyStatusResponse:
        store = get_user_settings_store()
        return ApiKeyStatusResponse(
            providers=[
                store.get_status("dashscope"),
                store.get_status("deepseek"),
            ]
        )

    @app.post("/api/settings/api-keys", response_model=ApiKeySaveResponse)
    def save_api_key(request: ApiKeySaveRequest) -> ApiKeySaveResponse:
        settings = get_settings()
        test_model = request.model if request.model and model_provider(request.model) == request.provider else None
        try:
            test_api_key(
                provider=request.provider,
                api_key=request.api_key,
                settings=settings,
                model=test_model,
            )
        except Exception as exc:
            raise HTTPException(
                status_code=400,
                detail=f"{PROVIDER_LABELS[request.provider]} API key test failed. Check the key and network connection.",
            ) from exc

        store = get_user_settings_store()
        store.save_api_key(request.provider, request.api_key)
        get_llm_client.cache_clear()
        get_service.cache_clear()
        return ApiKeySaveResponse(
            **store.get_status(request.provider),
            message="API key verified. Click Save project to persist it.",
        )

    @app.get("/api/projects", response_model=ProjectListResponse)
    def list_projects() -> ProjectListResponse:
        return ProjectListResponse(projects=get_project_manager().list_projects())

    @app.post("/api/projects")
    def create_project(request: ProjectCreateRequest):
        return get_project_manager().create_project(request)

    @app.get("/api/review-projects", response_model=ReviewProjectListResponse)
    def list_review_projects() -> ReviewProjectListResponse:
        return ReviewProjectListResponse(projects=get_review_manager().list_projects())

    @app.post("/api/review-projects")
    def create_review_project():
        raise HTTPException(
            status_code=400,
            detail="Review projects must be imported from a completed Screening project.",
        )

    @app.post("/api/runs/{run_id}/review-projects")
    def create_review_project_from_run(run_id: str):
        try:
            workspace = get_run_manager().get_review_workspace(run_id)
        except RunNotFoundError as exc:
            raise HTTPException(status_code=404, detail="Run not found.") from exc

        try:
            return get_review_manager().create_project_from_items(
                name=f"{workspace.project_name} review",
                source_filename=f"{run_id}_results_combined.xlsx",
                source_filenames=[f"{run_id}_results_combined.xlsx"],
                items=[
                    item.model_copy(
                        update={
                            "item_id": item.source_id,
                            "import_filename": f"{run_id}_results_combined.xlsx",
                            "linked_run_id": run_id,
                        }
                    )
                    for item in workspace.items
                ],
            )
        except ReviewFileFormatError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    @app.get("/api/review-projects/{project_id}")
    def get_review_project(project_id: str):
        try:
            return get_review_manager().get_project(project_id)
        except ReviewProjectNotFoundError as exc:
            raise HTTPException(status_code=404, detail="Review project not found.") from exc

    @app.put("/api/review-projects/{project_id}")
    def update_review_project(project_id: str, request: ReviewProjectUpdateRequest):
        try:
            return get_review_manager().update_project_name(project_id, request.name)
        except ReviewProjectNotFoundError as exc:
            raise HTTPException(status_code=404, detail="Review project not found.") from exc

    @app.delete("/api/review-projects/{project_id}")
    def delete_review_project(project_id: str):
        try:
            get_review_manager().delete_project(project_id)
        except ReviewProjectNotFoundError as exc:
            raise HTTPException(status_code=404, detail="Review project not found.") from exc
        return {"deleted": True, "project_id": project_id}

    @app.post("/api/review-projects/{project_id}/imports")
    async def append_review_project_imports(
        project_id: str,
        files: list[UploadFile] | None = File(default=None),
        file: UploadFile | None = File(default=None),
    ):
        try:
            uploads = await _read_review_uploads(files=files, file=file)
            return get_review_manager().append_project_files(project_id, uploads)
        except ReviewProjectNotFoundError as exc:
            raise HTTPException(status_code=404, detail="Review project not found.") from exc
        except ReviewFileFormatError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    @app.put("/api/review-projects/{project_id}/items/{source_id}")
    def save_review_project_item(project_id: str, source_id: str, request: HumanReviewUpdateRequest):
        try:
            saved_item = get_review_manager().save_review(project_id, source_id, request)
        except ReviewProjectNotFoundError as exc:
            raise HTTPException(status_code=404, detail="Review project not found.") from exc
        except ReviewItemNotFoundError as exc:
            raise HTTPException(status_code=404, detail="Review item not found.") from exc
        if saved_item.linked_run_id:
            try:
                get_run_manager().save_human_review(saved_item.linked_run_id, saved_item.source_id, request)
            except (RunNotFoundError, RunReviewItemNotFoundError):
                pass
        return saved_item

    @app.get("/api/review-projects/{project_id}/results.csv")
    def download_review_project_csv(project_id: str):
        try:
            path = get_review_manager().get_results_csv_path(project_id)
        except ReviewProjectNotFoundError as exc:
            raise HTTPException(status_code=404, detail="Review project not found.") from exc
        return FileResponse(path, media_type="text/csv", filename=f"{project_id}_results.csv")

    @app.get("/api/review-projects/{project_id}/results.xlsx")
    def download_review_project_xlsx(project_id: str):
        try:
            path = get_review_manager().get_results_xlsx_path(project_id)
        except ReviewProjectNotFoundError as exc:
            raise HTTPException(status_code=404, detail="Review project not found.") from exc
        return FileResponse(
            path,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            filename=f"{project_id}_results.xlsx",
        )

    @app.get("/api/review-projects/{project_id}/included.ris")
    def download_review_project_included_ris(project_id: str):
        try:
            path = get_review_manager().get_included_ris_path(project_id)
        except ReviewProjectNotFoundError as exc:
            raise HTTPException(status_code=404, detail="Review project not found.") from exc
        except ReviewRisExportError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc
        return FileResponse(
            path,
            media_type="application/x-research-info-systems",
            filename=f"{project_id}_included.ris",
        )

    @app.post("/api/projects/{project_id}/copy")
    def copy_project(project_id: str):
        try:
            return get_project_manager().copy_project(project_id)
        except ProjectNotFoundError as exc:
            raise HTTPException(status_code=404, detail="Project not found.") from exc

    @app.delete("/api/projects/{project_id}")
    def delete_project(project_id: str):
        try:
            get_project_manager().delete_project(project_id)
        except ProjectNotFoundError as exc:
            raise HTTPException(status_code=404, detail="Project not found.") from exc
        return {"ok": True}

    @app.get("/api/projects/{project_id}")
    def get_project(project_id: str):
        try:
            return get_project_manager().get_project(project_id)
        except ProjectNotFoundError as exc:
            raise HTTPException(status_code=404, detail="Project not found.") from exc

    @app.put("/api/projects/{project_id}")
    def update_project(project_id: str, request: ProjectUpdateRequest):
        try:
            return get_project_manager().update_project(project_id, request)
        except ProjectNotFoundError as exc:
            raise HTTPException(status_code=404, detail="Project not found.") from exc

    @app.put("/api/projects/{project_id}/criteria")
    def save_project_criteria(project_id: str, request: ProjectCriteriaUpdateRequest):
        try:
            return get_project_manager().save_criteria(project_id, request)
        except ProjectNotFoundError as exc:
            raise HTTPException(status_code=404, detail="Project not found.") from exc

    @app.post("/api/projects/{project_id}/import-ris")
    async def import_ris(project_id: str, files: list[UploadFile] = File(...)):
        try:
            get_project_manager().get_project(project_id)
        except ProjectNotFoundError as exc:
            raise HTTPException(status_code=404, detail="Project not found.") from exc

        if not files:
            raise HTTPException(status_code=400, detail="At least one RIS file is required.")

        payloads: list[tuple[str, bytes]] = []
        for uploaded in files:
            if not uploaded.filename:
                continue
            payloads.append((uploaded.filename, await uploaded.read()))

        studies, import_summary = load_ris_studies(payloads)
        if not studies:
            raise HTTPException(status_code=400, detail="No screenable studies were found in the uploaded RIS files.")
        return get_project_manager().append_imported_studies(project_id, studies, import_summary)

    @app.delete("/api/projects/{project_id}/imports/{filename:path}")
    def delete_project_import(project_id: str, filename: str):
        try:
            get_project_manager().get_project(project_id)
        except ProjectNotFoundError as exc:
            raise HTTPException(status_code=404, detail="Project not found.") from exc
        try:
            return get_project_manager().delete_imported_source(project_id, filename)
        except ValueError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc

    @app.get("/api/projects/{project_id}/imports/deduplicated.ris")
    def download_project_deduplicated_ris(project_id: str):
        try:
            path = get_project_manager().get_deduplicated_ris_path(project_id)
        except ProjectNotFoundError as exc:
            raise HTTPException(status_code=404, detail="Project not found.") from exc
        except ProjectExportEmptyError as exc:
            raise HTTPException(status_code=404, detail="Project has no imported studies to export.") from exc
        return FileResponse(
            path,
            media_type="application/x-research-info-systems",
            filename=f"{project_id}_deduplicated.ris",
        )

    @app.post("/api/projects/{project_id}/runs")
    def create_project_run(project_id: str):
        try:
            project = get_project_manager().get_project(project_id)
            studies = get_project_manager().load_project_studies(project_id)
        except ProjectNotFoundError as exc:
            raise HTTPException(status_code=404, detail="Project not found.") from exc

        if not project.inclusion_criteria or not project.exclusion_criteria:
            raise HTTPException(status_code=400, detail="Project criteria are not ready. Save criteria first.")
        if not studies:
            raise HTTPException(status_code=400, detail="Project has no imported studies.")
        for slot, model in (("A", project.model_a), ("B", project.model_b)):
            provider = model_provider(model)
            if not get_user_settings_store().get_local_api_key(provider):
                raise HTTPException(
                    status_code=400,
                    detail=f"{PROVIDER_LABELS[provider]} API key (Model {slot}: {model}) is not configured. Add and test it in Project settings first.",
                )
        if project.status == "running" and project.latest_run_id:
            try:
                return get_run_manager().start_run(project.latest_run_id)
            except RunNotFoundError:
                pass

        prepared = get_run_manager().prepare_run(
            request=PreparedRunRequest(
                project_id=project_id,
                project_name=project.name,
                inclusion_criteria=project.inclusion_criteria,
                exclusion_criteria=project.exclusion_criteria,
                model_a=project.model_a,
                model_b=project.model_b,
            ),
            studies=studies,
            import_summary=project.import_summary,
        )
        get_project_manager().set_project_run_status(project_id, status="running", latest_run_id=prepared.run_id)
        return get_run_manager().start_run(prepared.run_id)

    @app.get("/api/runs/{run_id}/status")
    def get_run_status(run_id: str, after_index: int = 0):
        try:
            return get_run_manager().get_status(run_id, after_index=max(after_index, 0))
        except RunNotFoundError as exc:
            raise HTTPException(status_code=404, detail="Run not found.") from exc

    @app.get("/api/runs/{run_id}/review")
    def get_run_review_workspace(run_id: str):
        try:
            return get_run_manager().get_review_workspace(run_id)
        except RunNotFoundError as exc:
            raise HTTPException(status_code=404, detail="Run not found.") from exc

    @app.put("/api/runs/{run_id}/review/{source_id}")
    def save_run_review_item(run_id: str, source_id: str, request: HumanReviewUpdateRequest):
        try:
            return get_run_manager().save_human_review(run_id, source_id, request)
        except RunNotFoundError as exc:
            raise HTTPException(status_code=404, detail="Run not found.") from exc
        except RunReviewItemNotFoundError as exc:
            raise HTTPException(status_code=404, detail="Review item not found.") from exc

    @app.post("/api/runs/{run_id}/models/{slot}/resume")
    def resume_run_model(run_id: str, slot: str):
        if slot not in ("a", "b"):
            raise HTTPException(status_code=400, detail="slot must be 'a' or 'b'.")
        try:
            return get_run_manager().resume_model(run_id, slot)  # type: ignore[arg-type]
        except RunNotFoundError as exc:
            raise HTTPException(status_code=404, detail="Run not found.") from exc

    @app.get("/api/runs/{run_id}/results/{slot}.xlsx")
    def download_results_xlsx(run_id: str, slot: str):
        if slot not in ("a", "b", "combined"):
            raise HTTPException(status_code=400, detail="slot must be 'a', 'b' or 'combined'.")
        try:
            slot_arg = None if slot == "combined" else slot
            path = get_run_manager().get_results_xlsx_path(run_id, slot_arg)  # type: ignore[arg-type]
        except RunNotFoundError as exc:
            raise HTTPException(status_code=404, detail="Run not found.") from exc
        return FileResponse(
            path,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            filename=f"{run_id}_results_{slot}.xlsx",
        )

    @app.get("/api/runs/{run_id}/errors/{slot}.ris")
    def download_errors_ris(run_id: str, slot: str):
        if slot not in ("a", "b"):
            raise HTTPException(status_code=400, detail="slot must be 'a' or 'b'.")
        try:
            path = get_run_manager().get_errors_ris_path(run_id, slot)  # type: ignore[arg-type]
        except RunNotFoundError as exc:
            raise HTTPException(status_code=404, detail="Run not found.") from exc
        except RunExportEmptyError as exc:
            raise HTTPException(status_code=404, detail="This model has no failed records to export.") from exc
        return FileResponse(path, media_type="application/x-research-info-systems", filename=f"{run_id}_errors_{slot}.ris")

    @app.post("/screen", response_model=ScreeningResponse)
    def screen_abstract(request: ScreeningRequest) -> ScreeningResponse:
        try:
            return get_service().screen(request)
        except LLMOutputError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc

    return app


app = create_app()


def _recommended_step(project) -> str:
    if not project.inclusion_criteria or not project.exclusion_criteria:
        return "criteria"
    if project.import_summary.deduplicated_count == 0:
        return "import"
    return "run"


async def _read_review_uploads(
    *,
    files: list[UploadFile] | None,
    file: UploadFile | None,
) -> list[tuple[str, bytes]]:
    uploads = [uploaded for uploaded in (files or []) if uploaded.filename]
    if file and file.filename:
        uploads.append(file)
    if not uploads:
        raise ReviewFileFormatError("At least one CSV/XLSX results file or RIS source file is required.")

    payloads: list[tuple[str, bytes]] = []
    for uploaded in uploads:
        if not uploaded.filename:
            continue
        payloads.append((uploaded.filename, await uploaded.read()))

    if not payloads:
        raise ReviewFileFormatError("At least one CSV/XLSX results file or RIS source file is required.")
    return payloads
