const createProjectForm = document.getElementById("create-project-form");
const projectsGrid = document.getElementById("projects-grid");
const screeningProjectsBody = document.getElementById("screening-projects-body");
const screeningProjectsPagination = document.getElementById("screening-projects-pagination");
const screeningProjectStatusFilter = document.getElementById("screening-project-status-filter");
const reviewProjectStatusFilter = document.getElementById("review-project-status-filter");
const screeningProjectSort = document.getElementById("screening-project-sort");
const reviewProjectSort = document.getElementById("review-project-sort");
const toggleScreeningProjectsButton = document.getElementById("toggle-screening-projects-button");
const createProjectModal = document.getElementById("create-project-modal");
const openCreateProjectButton = document.getElementById("open-create-project-button");
const closeCreateProjectButton = document.getElementById("close-create-project-button");
const cancelCreateProjectButton = document.getElementById("cancel-create-project-button");
const createProjectBackdrop = document.getElementById("create-project-backdrop");

const reviewProjectsGrid = document.getElementById("review-projects-grid");
const reviewProjectsBody = document.getElementById("review-projects-body");
const reviewProjectsPagination = document.getElementById("review-projects-pagination");
const toggleReviewProjectsButton = document.getElementById("toggle-review-projects-button");

const deleteProjectModal = document.getElementById("delete-project-modal");
const deleteProjectBackdrop = document.getElementById("delete-project-backdrop");
const cancelDeleteProjectButton = document.getElementById("cancel-delete-project-button");
const confirmDeleteProjectButton = document.getElementById("confirm-delete-project-button");
const copyProjectModal = document.getElementById("copy-project-modal");
const copyProjectBackdrop = document.getElementById("copy-project-backdrop");
const cancelCopyProjectButton = document.getElementById("cancel-copy-project-button");
const confirmCopyProjectButton = document.getElementById("confirm-copy-project-button");

window.alert = showNotice;

let pendingDeleteProjectId = "";
let pendingDeleteButton = null;
let pendingDeleteKind = "screening";
let pendingCopyProjectId = "";
let screeningProjects = [];
let reviewProjects = [];
let screeningProjectsCollapsed = readBooleanPreference("home-screening-projects-collapsed");
let reviewProjectsCollapsed = readBooleanPreference("home-review-projects-collapsed");
const HOME_PAGE_SIZE = 10;
let screeningProjectsPage = 1;
let reviewProjectsPage = 1;

if (openCreateProjectButton) {
  openCreateProjectButton.addEventListener("click", openCreateProjectModalFn);
}

if (closeCreateProjectButton) {
  closeCreateProjectButton.addEventListener("click", closeCreateProjectModalFn);
}

if (cancelCreateProjectButton) {
  cancelCreateProjectButton.addEventListener("click", closeCreateProjectModalFn);
}

if (createProjectBackdrop) {
  createProjectBackdrop.addEventListener("click", closeCreateProjectModalFn);
}

if (screeningProjectStatusFilter) {
  screeningProjectStatusFilter.addEventListener("change", () => {
    screeningProjectsPage = 1;
    renderScreeningProjects();
  });
}

if (reviewProjectStatusFilter) {
  reviewProjectStatusFilter.addEventListener("change", () => {
    reviewProjectsPage = 1;
    renderReviewProjects();
  });
}

if (screeningProjectSort) {
  screeningProjectSort.addEventListener("change", () => {
    screeningProjectsPage = 1;
    renderScreeningProjects();
  });
}

if (reviewProjectSort) {
  reviewProjectSort.addEventListener("change", () => {
    reviewProjectsPage = 1;
    renderReviewProjects();
  });
}

if (toggleScreeningProjectsButton) {
  toggleScreeningProjectsButton.addEventListener("click", () => {
    screeningProjectsCollapsed = !screeningProjectsCollapsed;
    window.localStorage.setItem("home-screening-projects-collapsed", String(screeningProjectsCollapsed));
    syncSectionVisibility();
  });
}

if (toggleReviewProjectsButton) {
  toggleReviewProjectsButton.addEventListener("click", () => {
    reviewProjectsCollapsed = !reviewProjectsCollapsed;
    window.localStorage.setItem("home-review-projects-collapsed", String(reviewProjectsCollapsed));
    syncSectionVisibility();
  });
}

if (deleteProjectBackdrop) {
  deleteProjectBackdrop.addEventListener("click", closeDeleteProjectModal);
}

if (copyProjectBackdrop) {
  copyProjectBackdrop.addEventListener("click", closeCopyProjectModal);
}

if (cancelDeleteProjectButton) {
  cancelDeleteProjectButton.addEventListener("click", closeDeleteProjectModal);
}

if (cancelCopyProjectButton) {
  cancelCopyProjectButton.addEventListener("click", closeCopyProjectModal);
}

if (confirmDeleteProjectButton) {
  confirmDeleteProjectButton.addEventListener("click", async () => {
    if (!pendingDeleteProjectId || !(pendingDeleteButton instanceof HTMLButtonElement)) {
      closeDeleteProjectModal();
      return;
    }
    if (pendingDeleteKind === "review") {
      await deleteReviewProject(pendingDeleteProjectId, pendingDeleteButton);
    } else {
      await deleteProject(pendingDeleteProjectId, pendingDeleteButton);
    }
    closeDeleteProjectModal();
  });
}

if (confirmCopyProjectButton) {
  confirmCopyProjectButton.addEventListener("click", async () => {
    if (!pendingCopyProjectId) {
      closeCopyProjectModal();
      return;
    }
    await copyProject(pendingCopyProjectId);
    closeCopyProjectModal();
  });
}

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeCreateProjectModalFn();
    closeDeleteProjectModal();
    closeCopyProjectModal();
  }
});

if (createProjectForm) {
  createProjectForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(createProjectForm);
    const modelA = String(formData.get("model_a") || "").trim() || window.defaultModelA || "qwen3.6-flash";
    const modelB = String(formData.get("model_b") || "").trim() || window.defaultModelB || "deepseek-v4-flash";
    const payload = {
      name: String(formData.get("name") || "").trim(),
      description: String(formData.get("description") || "").trim(),
      model_a: modelA,
      model_b: modelB,
    };

    if (!payload.name) {
      window.alert("Project name is required.");
      return;
    }
    if (!payload.model_a || !payload.model_b || payload.model_a === payload.model_b) {
      window.alert("Model A and Model B must be different.");
      return;
    }

    const response = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await parseJsonSafely(response);
    if (!response.ok) {
      window.alert(data.detail || "Failed to create project.");
      return;
    }
    closeCreateProjectModalFn();
    window.location.href = `/projects/${data.project_id}/project`;
  });
}

if (projectsGrid) {
  projectsGrid.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const actionButton = target.closest("[data-project-action]");
    if (!(actionButton instanceof HTMLElement)) {
      return;
    }

    const projectId = actionButton.dataset.projectId || "";
    const action = actionButton.dataset.projectAction || "";
    if (!projectId || !action) {
      return;
    }

    if (action === "copy") {
      openCopyProjectModal(projectId);
      return;
    }

    if (action === "delete") {
      openDeleteProjectModal(projectId, actionButton, "screening");
    }
  });
}

if (screeningProjectsPagination) {
  screeningProjectsPagination.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const button = target.closest("[data-home-page]");
    if (!(button instanceof HTMLElement)) return;
    const page = Number(button.dataset.homePage || 1);
    if (!Number.isFinite(page)) return;
    screeningProjectsPage = page;
    renderScreeningProjects();
  });
}

if (reviewProjectsPagination) {
  reviewProjectsPagination.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const button = target.closest("[data-home-page]");
    if (!(button instanceof HTMLElement)) return;
    const page = Number(button.dataset.homePage || 1);
    if (!Number.isFinite(page)) return;
    reviewProjectsPage = page;
    renderReviewProjects();
  });
}

if (reviewProjectsGrid) {
  reviewProjectsGrid.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const actionButton = target.closest("[data-review-action]");
    if (!(actionButton instanceof HTMLElement)) return;
    const projectId = actionButton.dataset.reviewProjectId || "";
    const action = actionButton.dataset.reviewAction || "";
    if (!projectId || !action) return;
    if (action === "delete") {
      openDeleteProjectModal(projectId, actionButton, "review");
    }
  });
}

if (projectsGrid) {
  projectsGrid.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const emptyAction = target.closest("[data-empty-action]");
    if (emptyAction instanceof HTMLElement && emptyAction.dataset.emptyAction === "create-screening") {
      openCreateProjectModalFn?.();
    }
  });
}

async function loadProjects() {
  await Promise.all([loadScreeningProjects(), loadReviewProjects()]);
}

async function loadScreeningProjects() {
  if (!projectsGrid) {
    return;
  }
  const response = await fetch("/api/projects");
  const payload = await parseJsonSafely(response);
  if (!response.ok) {
    projectsGrid.innerHTML = `<p class="muted">Failed to load screening projects.</p>`;
    return;
  }

  screeningProjects = payload.projects || [];
  assignProjectTags(screeningProjects);
  renderScreeningProjects();
}

async function loadReviewProjects() {
  if (!reviewProjectsGrid) {
    return;
  }
  const response = await fetch("/api/review-projects");
  const payload = await parseJsonSafely(response);
  if (!response.ok) {
    reviewProjectsGrid.innerHTML = `<p class="muted">Failed to load review projects.</p>`;
    return;
  }

  reviewProjects = payload.projects || [];
  assignProjectTags(reviewProjects);
  renderReviewProjects();
}

function assignProjectTags(list) {
  const sortedByCreated = [...list].sort((a, b) => tsValue(a.created_at) - tsValue(b.created_at));
  sortedByCreated.forEach((project, idx) => {
    project.__tag = `#${idx + 1}`;
  });
}

function renderScreeningProjects() {
  if (!projectsGrid) {
    return;
  }

  syncStatusCounts(screeningProjectStatusFilter, screeningProjects, getScreeningProjectStatusKey);

  const statusFilter = screeningProjectStatusFilter?.value || "all";
  const sortKey = screeningProjectSort?.value || "updated_desc";
  const filteredProjects = screeningProjects.filter(
    (project) => statusFilter === "all" || getScreeningProjectStatusKey(project) === statusFilter,
  );
  sortScreeningProjects(filteredProjects, sortKey);

  if (!screeningProjects.length) {
    projectsGrid.innerHTML = `
      <article class="empty-card">
        <h3>No screening projects yet</h3>
        <p>Start by creating your first screening project.</p>
        <button type="button" class="outline-action-button" data-empty-action="create-screening">Create project</button>
      </article>`;
    renderHomePagination(screeningProjectsPagination, 0, 1);
    syncSectionVisibility();
    return;
  }

  if (!filteredProjects.length) {
    projectsGrid.innerHTML = `<article class="empty-card"><h3>No matching screening projects</h3><p>Change the status filter to show more projects.</p></article>`;
    renderHomePagination(screeningProjectsPagination, 0, 1);
    syncSectionVisibility();
    return;
  }

  const pageCount = Math.max(1, Math.ceil(filteredProjects.length / HOME_PAGE_SIZE));
  screeningProjectsPage = clampPage(screeningProjectsPage, pageCount);
  const visibleProjects = paginateItems(filteredProjects, screeningProjectsPage);
  projectsGrid.innerHTML = visibleProjects.map(renderScreeningProjectCard).join("");
  renderHomePagination(screeningProjectsPagination, filteredProjects.length, screeningProjectsPage);
  syncSectionVisibility();
}

function sortScreeningProjects(list, sortKey) {
  list.sort((a, b) => {
    if (sortKey === "name_asc") return (a.name || "").localeCompare(b.name || "");
    if (sortKey === "papers_desc") return (b.paper_count || 0) - (a.paper_count || 0);
    if (sortKey === "created_desc") return tsValue(b.created_at) - tsValue(a.created_at);
    return tsValue(b.updated_at) - tsValue(a.updated_at);
  });
}

function tsValue(value) {
  const t = new Date(value || 0).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function syncStatusCounts(selectEl, items, getKey) {
  if (!selectEl) return;
  const counts = { all: items.length };
  for (const item of items) {
    const key = getKey(item);
    counts[key] = (counts[key] || 0) + 1;
  }
  for (const opt of selectEl.options) {
    const baseLabel = opt.dataset.baseLabel || opt.textContent.replace(/\s*\(\d+\)$/, "");
    opt.dataset.baseLabel = baseLabel;
    const c = counts[opt.value] || 0;
    opt.textContent = `${baseLabel} (${c})`;
  }
}

function renderReviewProjects() {
  if (!reviewProjectsGrid) {
    return;
  }

  syncStatusCounts(reviewProjectStatusFilter, reviewProjects, getReviewProjectStatusKey);

  const statusFilter = reviewProjectStatusFilter?.value || "all";
  const sortKey = reviewProjectSort?.value || "updated_desc";
  const filteredProjects = reviewProjects.filter(
    (project) => statusFilter === "all" || getReviewProjectStatusKey(project) === statusFilter,
  );
  sortReviewProjects(filteredProjects, sortKey);

  if (!reviewProjects.length) {
    reviewProjectsGrid.innerHTML = `
      <article class="empty-card">
        <h3>No review projects yet</h3>
        <p>Open a completed Screening project and use Import into review project.</p>
      </article>`;
    renderHomePagination(reviewProjectsPagination, 0, 1);
    syncSectionVisibility();
    return;
  }

  if (!filteredProjects.length) {
    reviewProjectsGrid.innerHTML = `<article class="empty-card"><h3>No matching review projects</h3><p>Change the status filter to show more projects.</p></article>`;
    renderHomePagination(reviewProjectsPagination, 0, 1);
    syncSectionVisibility();
    return;
  }

  const pageCount = Math.max(1, Math.ceil(filteredProjects.length / HOME_PAGE_SIZE));
  reviewProjectsPage = clampPage(reviewProjectsPage, pageCount);
  const visibleProjects = paginateItems(filteredProjects, reviewProjectsPage);
  reviewProjectsGrid.innerHTML = visibleProjects.map(renderReviewProjectCard).join("");
  renderHomePagination(reviewProjectsPagination, filteredProjects.length, reviewProjectsPage);
  syncSectionVisibility();
}

function sortReviewProjects(list, sortKey) {
  list.sort((a, b) => {
    if (sortKey === "name_asc") return (a.name || "").localeCompare(b.name || "");
    if (sortKey === "created_desc") return tsValue(b.created_at) - tsValue(a.created_at);
    if (sortKey === "progress_asc") return reviewProgress(a) - reviewProgress(b);
    if (sortKey === "progress_desc") return reviewProgress(b) - reviewProgress(a);
    return tsValue(b.updated_at) - tsValue(a.updated_at);
  });
}

function paginateItems(items, page) {
  const start = (page - 1) * HOME_PAGE_SIZE;
  return items.slice(start, start + HOME_PAGE_SIZE);
}

function clampPage(page, pageCount) {
  if (!Number.isFinite(page) || page < 1) return 1;
  return Math.min(page, pageCount);
}

function renderHomePagination(container, total, currentPage) {
  if (!container) return;
  const pageCount = Math.ceil(total / HOME_PAGE_SIZE);
  if (pageCount <= 1) {
    container.classList.add("hidden");
    container.innerHTML = "";
    return;
  }
  container.classList.remove("hidden");
  const start = (currentPage - 1) * HOME_PAGE_SIZE + 1;
  const end = Math.min(total, currentPage * HOME_PAGE_SIZE);
  container.innerHTML = `
    <span class="muted">${start}-${end} of ${total}</span>
    <div class="home-pagination-actions">
      <button type="button" class="secondary small-button" data-home-page="${currentPage - 1}" ${currentPage <= 1 ? "disabled" : ""}>Previous</button>
      <span class="home-page-indicator">${currentPage} / ${pageCount}</span>
      <button type="button" class="secondary small-button" data-home-page="${currentPage + 1}" ${currentPage >= pageCount ? "disabled" : ""}>Next</button>
    </div>
  `;
}

function reviewProgress(project) {
  const total = reviewNeededTotal(project);
  const reviewed = reviewNeededReviewed(project);
  if (total === 0) return 1;
  return reviewed / total;
}

function getReviewProjectStatusKey(project) {
  const total = Number(project?.counts?.total || 0);
  const needsReviewTotal = reviewNeededTotal(project);
  const needsReviewReviewed = reviewNeededReviewed(project);
  if (total === 0) return "not_started";
  if (needsReviewTotal === 0 || needsReviewReviewed >= needsReviewTotal) return "reviewed";
  if (needsReviewReviewed === 0) return "ready_to_review";
  return "in_review";
}

function renderScreeningProjectCard(project) {
  const description = (project.description || "").trim() || "No description provided.";
  return `
    <article class="project-card compact-project-card screening-project-card">
      <div class="project-card-top compact-project-card-top">
        <div class="project-card-heading">
          <h3><span class="project-tag">${escapeHtml(project.__tag || "")}</span>${escapeHtml(project.name)}</h3>
          <p class="muted project-card-secondary-line" title="${escapeHtml(description)}">${escapeHtml(description)}</p>
        </div>
        <span class="pill ${statusClassName(project.status)}">${escapeHtml(formatProjectStatus(project))}</span>
      </div>
      <div class="project-card-meta-row">
        <span class="chip compact-chip">${project.paper_count} papers</span>
        <span class="muted project-card-updated">Updated ${formatDate(project.updated_at)}</span>
      </div>
      <div class="project-card-footer compact-project-card-footer">
        <div class="project-card-footer-actions">
          <div class="project-card-actions subtle-actions compact-project-card-actions">
            <button type="button" class="text-action-button" data-project-action="copy" data-project-id="${project.project_id}">
              Copy
            </button>
            <button type="button" class="text-action-button danger-text-button" data-project-action="delete" data-project-id="${project.project_id}">
              Delete
            </button>
          </div>
          <a class="button-link project-open-link compact-project-open-link" href="/projects/${project.project_id}">Open</a>
        </div>
      </div>
    </article>
  `;
}

function renderReviewProjectCard(project) {
  const sourceLabel = shortenSourceLabel(project.source_filename || "Uploaded screening results");
  const fullSourceLabel = project.source_filename || "Uploaded screening results";
  const total = Number(project.counts?.total || 0);
  const needsReviewTotal = reviewNeededTotal(project);
  const needsReviewReviewed = reviewNeededReviewed(project);
  const needsReviewLabel = needsReviewTotal > 0
    ? `Needs review ${needsReviewReviewed}/${needsReviewTotal}`
    : "No review needed";
  return `
    <article class="project-card compact-project-card review-project-card">
      <div class="project-card-top compact-project-card-top">
        <div class="project-card-heading">
          <h3><span class="project-tag">${escapeHtml(project.__tag || "")}</span>${escapeHtml(project.name)}</h3>
          <p class="muted project-card-secondary-line" title="${escapeHtml(fullSourceLabel)}">${escapeHtml(sourceLabel)}</p>
        </div>
        <span class="pill ${reviewStatusClassName(project)}">${escapeHtml(formatReviewProjectStatus(project))}</span>
      </div>
      <div class="project-card-meta-row">
        <span class="chip compact-chip">${total} papers</span>
        <span class="chip compact-chip">${escapeHtml(needsReviewLabel)}</span>
        <span class="muted project-card-updated">Updated ${formatDate(project.updated_at)}</span>
      </div>
      <div class="project-card-footer compact-project-card-footer">
        <div class="project-card-footer-actions">
          <div class="project-card-actions subtle-actions compact-project-card-actions">
            <button type="button" class="text-action-button danger-text-button" data-review-action="delete" data-review-project-id="${project.project_id}">
              Delete
            </button>
          </div>
          <a class="button-link project-open-link compact-project-open-link" href="/review-projects/${project.project_id}">Open</a>
        </div>
      </div>
    </article>
  `;
}

function shortenSourceLabel(value) {
  const s = String(value || "");
  if (s.length <= 40) return s;
  return `${s.slice(0, 18)}…${s.slice(-18)}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function copyProject(projectId) {
  try {
    const response = await fetch(`/api/projects/${projectId}/copy`, { method: "POST" });
    const payload = await parseJsonSafely(response);
    if (!response.ok) {
      window.alert(payload.detail || "Failed to copy project.");
      return;
    }
    window.location.href = `/projects/${payload.project_id}/project`;
  } catch (error) {
    console.error(error);
    window.alert("Could not reach the backend while copying the project.");
  }
}

async function deleteProject(projectId, button) {
  setActionBusy(button, true, "Deleting...");
  try {
    const response = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
    const payload = await parseJsonSafely(response);
    if (!response.ok) {
      window.alert(payload.detail || "Failed to delete project.");
      return;
    }
    await loadScreeningProjects();
  } catch (error) {
    console.error(error);
    window.alert("Could not reach the backend while deleting the project.");
  } finally {
    setActionBusy(button, false);
  }
}

async function deleteReviewProject(projectId, button) {
  setActionBusy(button, true, "Deleting...");
  try {
    const response = await fetch(`/api/review-projects/${projectId}`, { method: "DELETE" });
    const payload = await parseJsonSafely(response);
    if (!response.ok) {
      window.alert(payload.detail || "Failed to delete review project.");
      return;
    }
    await loadReviewProjects();
  } catch (error) {
    console.error(error);
    window.alert("Could not reach the backend while deleting the review project.");
  } finally {
    setActionBusy(button, false);
  }
}

function formatProjectStatus(project) {
  const status = project?.status || "idle";
  if (status === "completed") {
    return "Done";
  }
  if (status === "running") {
    return "Running";
  }
  if (status === "failed") {
    return "Failed";
  }
  if (status === "prepared") {
    return "Ready";
  }
  if ((project?.paper_count || 0) > 0) {
    return "Ready to run";
  }
  return "Not started";
}

function getScreeningProjectStatusKey(project) {
  const status = project?.status || "idle";
  if (status === "running" || status === "completed" || status === "failed") {
    return status;
  }
  if ((project?.paper_count || 0) > 0) {
    return "ready_to_run";
  }
  return "not_started";
}

function formatReviewProjectStatus(project) {
  const total = Number(project?.counts?.total || 0);
  const needsReviewTotal = reviewNeededTotal(project);
  const needsReviewReviewed = reviewNeededReviewed(project);
  if (total === 0) {
    return "Not started";
  }
  if (needsReviewTotal === 0 || needsReviewReviewed >= needsReviewTotal) {
    return "Reviewed";
  }
  if (needsReviewReviewed === 0) {
    return "Ready to review";
  }
  return "In review";
}

function reviewStatusClassName(project) {
  const total = Number(project?.counts?.total || 0);
  const needsReviewTotal = reviewNeededTotal(project);
  const needsReviewReviewed = reviewNeededReviewed(project);
  if (total > 0 && (needsReviewTotal === 0 || needsReviewReviewed >= needsReviewTotal)) {
    return "status-completed";
  }
  if (needsReviewReviewed > 0) {
    return "status-running";
  }
  return "status-prepared";
}

function reviewNeededTotal(project) {
  return Number(project?.counts?.needs_review_total || 0);
}

function reviewNeededReviewed(project) {
  return Number(project?.counts?.needs_review_reviewed || 0);
}

function statusClassName(status) {
  return `status-${status || "idle"}`;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "recently";
  }
  return date.toLocaleDateString();
}

function setActionBusy(button, isBusy, label = "") {
  if (!(button instanceof HTMLButtonElement)) {
    return;
  }
  if (!button.dataset.originalLabel) {
    button.dataset.originalLabel = button.textContent || "";
  }
  button.disabled = isBusy;
  button.textContent = isBusy ? label : button.dataset.originalLabel;
}

async function parseJsonSafely(response) {
  const text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { detail: text };
  }
}

function syncSectionVisibility() {
  if (screeningProjectsBody) {
    screeningProjectsBody.classList.toggle("hidden", screeningProjectsCollapsed);
  }
  if (toggleScreeningProjectsButton) {
    toggleScreeningProjectsButton.textContent = screeningProjectsCollapsed ? "Expand" : "Collapse";
    toggleScreeningProjectsButton.setAttribute("aria-expanded", screeningProjectsCollapsed ? "false" : "true");
  }
  if (reviewProjectsBody) {
    reviewProjectsBody.classList.toggle("hidden", reviewProjectsCollapsed);
  }
  if (toggleReviewProjectsButton) {
    toggleReviewProjectsButton.textContent = reviewProjectsCollapsed ? "Expand" : "Collapse";
    toggleReviewProjectsButton.setAttribute("aria-expanded", reviewProjectsCollapsed ? "false" : "true");
  }
}

function readBooleanPreference(key) {
  return window.localStorage.getItem(key) === "true";
}

function showNotice(message) {
  const modal = getNoticeModal();
  const messageElement = modal.querySelector("[data-notice-message]");
  if (messageElement) {
    messageElement.textContent = String(message || "");
  }
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  const button = modal.querySelector("[data-notice-close]");
  if (button instanceof HTMLButtonElement) {
    button.focus();
  }
}

function closeNotice() {
  const modal = document.getElementById("notice-modal");
  if (!modal) {
    return;
  }
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
}

function getNoticeModal() {
  let modal = document.getElementById("notice-modal");
  if (modal) {
    return modal;
  }

  modal = document.createElement("div");
  modal.id = "notice-modal";
  modal.className = "modal-shell notice-modal hidden";
  modal.setAttribute("aria-hidden", "true");
  modal.innerHTML = `
    <div class="modal-backdrop" data-notice-close></div>
    <section class="modal-card modal-card-sm notice-card" role="dialog" aria-modal="true" aria-labelledby="notice-title">
      <div class="notice-content">
        <span class="notice-icon" aria-hidden="true">i</span>
        <div class="stack">
          <div>
            <p class="eyebrow">Notice</p>
            <h2 id="notice-title">Action needed</h2>
          </div>
          <p class="notice-message" data-notice-message></p>
          <div class="actions modal-actions">
            <button type="button" data-notice-close>OK</button>
          </div>
        </div>
      </div>
    </section>
  `;
  modal.addEventListener("click", (event) => {
    const target = event.target;
    if (target instanceof HTMLElement && target.matches("[data-notice-close]")) {
      closeNotice();
    }
  });
  document.body.append(modal);
  return modal;
}

function openCreateProjectModalFn() {
  if (!createProjectModal) {
    return;
  }
  createProjectModal.classList.remove("hidden");
  createProjectModal.setAttribute("aria-hidden", "false");
  const nameInput = createProjectForm?.querySelector('input[name="name"]');
  if (nameInput instanceof HTMLInputElement) {
    window.requestAnimationFrame(() => nameInput.focus());
  }
}

function closeCreateProjectModalFn() {
  if (!createProjectModal) {
    return;
  }
  createProjectModal.classList.add("hidden");
  createProjectModal.setAttribute("aria-hidden", "true");
}

function openDeleteProjectModal(projectId, button, kind = "screening") {
  if (!deleteProjectModal) {
    return;
  }
  pendingDeleteProjectId = projectId;
  pendingDeleteButton = button instanceof HTMLButtonElement ? button : null;
  pendingDeleteKind = kind === "review" ? "review" : "screening";
  const titleEl = document.getElementById("delete-project-title");
  const confirmEl = document.getElementById("confirm-delete-project-button");
  if (titleEl) titleEl.textContent = pendingDeleteKind === "review" ? "Remove this review project?" : "Remove this project?";
  if (confirmEl) confirmEl.textContent = pendingDeleteKind === "review" ? "Delete review project" : "Delete project";
  deleteProjectModal.classList.remove("hidden");
  deleteProjectModal.setAttribute("aria-hidden", "false");
}

function closeDeleteProjectModal() {
  if (!deleteProjectModal) {
    return;
  }
  deleteProjectModal.classList.add("hidden");
  deleteProjectModal.setAttribute("aria-hidden", "true");
  pendingDeleteProjectId = "";
  pendingDeleteButton = null;
  pendingDeleteKind = "screening";
}

function openCopyProjectModal(projectId) {
  if (!copyProjectModal) {
    return;
  }
  pendingCopyProjectId = projectId;
  copyProjectModal.classList.remove("hidden");
  copyProjectModal.setAttribute("aria-hidden", "false");
}

function closeCopyProjectModal() {
  if (!copyProjectModal) {
    return;
  }
  copyProjectModal.classList.add("hidden");
  copyProjectModal.setAttribute("aria-hidden", "true");
  pendingCopyProjectId = "";
}

syncSectionVisibility();
loadProjects();
