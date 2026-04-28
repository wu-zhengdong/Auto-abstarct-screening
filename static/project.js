const pageRoot = document.querySelector("[data-project-id]");
const projectId = pageRoot?.dataset.projectId || "";
const currentStep = pageRoot?.dataset.currentStep || "";
const nextStep = pageRoot?.dataset.nextStep || null;

window.alert = showNotice;

const projectName = document.getElementById("project-name");
const projectDescription = document.getElementById("project-description");
const projectStatusPill = document.getElementById("project-status-pill");
const projectModelAPill = document.getElementById("project-model-a-pill");
const projectModelBPill = document.getElementById("project-model-b-pill");

const projectForm = document.getElementById("project-form");
const projectNameInput = document.getElementById("project-name-input");
const projectDescriptionInput = document.getElementById("project-description-input");
const projectModelAInput = document.getElementById("project-model-a-input");
const projectModelBInput = document.getElementById("project-model-b-input");
const apiSettingsCard = document.querySelector("[data-api-providers]");
const projectFormStatus = document.getElementById("project-form-status");
const saveProjectNextButton = document.getElementById("save-project-next-button");

const inclusionList = document.getElementById("inclusion-list");
const exclusionList = document.getElementById("exclusion-list");
const addInclusionButton = document.getElementById("add-inclusion-button");
const addExclusionButton = document.getElementById("add-exclusion-button");
const saveCriteriaButton = document.getElementById("save-criteria-button");
const saveCriteriaNextButton = document.getElementById("save-criteria-next-button");
const criteriaStatus = document.getElementById("criteria-status");

const risFilesInput = document.getElementById("ris-files");
const importDropzone = document.getElementById("import-dropzone");
const selectedFiles = document.getElementById("selected-files");
const importButton = document.getElementById("import-button");
const importStatus = document.getElementById("import-status");
const importNextLink = document.getElementById("import-next-link");
const importExportDedupedRisLink = document.getElementById("import-export-deduped-ris-link");

const runButton = document.getElementById("run-button");
const resumeAButton = document.getElementById("resume-a-button");
const resumeBButton = document.getElementById("resume-b-button");
const createReviewProjectButton = document.getElementById("create-review-project-button");
const runMeta = document.getElementById("run-meta");
const runModelCopy = document.getElementById("run-model-copy");
const exportActions = document.getElementById("export-actions");
const exportToggleButton = document.getElementById("export-toggle-button");
const exportMenu = document.getElementById("export-menu");
const exportALink = document.getElementById("export-a-link");
const exportBLink = document.getElementById("export-b-link");
const exportCombinedLink = document.getElementById("export-combined-link");
const errorsRisALink = document.getElementById("errors-ris-a-link");
const errorsRisBLink = document.getElementById("errors-ris-b-link");
const progressLabelA = document.getElementById("progress-label-a");
const progressLabelB = document.getElementById("progress-label-b");
const progressStatusA = document.getElementById("progress-status-a");
const progressStatusB = document.getElementById("progress-status-b");
const progressBarA = document.getElementById("progress-bar-a");
const progressBarB = document.getElementById("progress-bar-b");
const progressTextA = document.getElementById("progress-text-a");
const progressTextB = document.getElementById("progress-text-b");
const lastErrorA = document.getElementById("last-error-a");
const lastErrorB = document.getElementById("last-error-b");
const resultsCountPill = document.getElementById("results-count-pill");
const resultsEmpty = document.getElementById("results-empty");
const resultsTableShell = document.getElementById("results-table-shell");
const resultsTableBody = document.getElementById("results-table-body");
const resultsPagination = document.getElementById("results-pagination");
const resultsPrevButton = document.getElementById("results-prev-button");
const resultsNextButton = document.getElementById("results-next-button");
const resultsPageMeta = document.getElementById("results-page-meta");

const reviewFilterA = document.getElementById("review-filter-a");
const reviewFilterB = document.getElementById("review-filter-b");
const reviewFilterConsensus = document.getElementById("review-filter-consensus");
const reviewFilterHuman = document.getElementById("review-filter-human");
const reviewSearch = document.getElementById("review-search");
const reviewAdoptAgreeButton = document.getElementById("review-adopt-agree-button");
const reviewExportALink = document.getElementById("review-export-a-link");
const reviewExportBLink = document.getElementById("review-export-b-link");
const reviewExportCombinedLink = document.getElementById("review-export-combined-link");
const reviewEmpty = document.getElementById("review-empty");
const reviewShell = document.getElementById("review-shell");
const reviewVisibleCount = document.getElementById("review-visible-count");
const reviewList = document.getElementById("review-list");
const reviewDetailEmpty = document.getElementById("review-detail-empty");
const reviewDetailContent = document.getElementById("review-detail-content");
const reviewSequence = document.getElementById("review-sequence");
const reviewTitle = document.getElementById("review-title");
const reviewModelAPill = document.getElementById("review-model-a-pill");
const reviewModelBPill = document.getElementById("review-model-b-pill");
const reviewConsensusPill = document.getElementById("review-consensus-pill");
const reviewHumanPill = document.getElementById("review-human-pill");
const reviewMeta = document.getElementById("review-meta");
const reviewAbstract = document.getElementById("review-abstract");
const reviewSummaryBadge = document.getElementById("review-summary-badge");
const reviewReasonA = document.getElementById("review-reason-a");
const reviewReasonB = document.getElementById("review-reason-b");
const reviewInclusionSection = document.getElementById("review-inclusion-section");
const reviewInclusionToggle = document.getElementById("review-inclusion-toggle");
const reviewInclusionToggleLabel = document.getElementById("review-inclusion-toggle-label");
const reviewInclusionA = document.getElementById("review-inclusion-a");
const reviewInclusionB = document.getElementById("review-inclusion-b");
const reviewExclusionSection = document.getElementById("review-exclusion-section");
const reviewExclusionToggle = document.getElementById("review-exclusion-toggle");
const reviewExclusionToggleLabel = document.getElementById("review-exclusion-toggle-label");
const reviewExclusionA = document.getElementById("review-exclusion-a");
const reviewExclusionB = document.getElementById("review-exclusion-b");
const reviewHumanYesButton = document.getElementById("review-human-yes");
const reviewHumanMaybeButton = document.getElementById("review-human-maybe");
const reviewHumanNoButton = document.getElementById("review-human-no");
const reviewHumanReasonInput = document.getElementById("review-human-reason");
const reviewSaveButton = document.getElementById("review-save-button");
const reviewSaveStatus = document.getElementById("review-save-status");

const state = {
  latestRunId: null,
  pollTimer: null,
  modelA: projectModelAInput?.value || window.defaultModelA || "qwen3.6-flash",
  modelB: projectModelBInput?.value || window.defaultModelB || "deepseek-v4-flash",
  apiKeyStatuses: {},
  inclusionCriteria: [],
  exclusionCriteria: [],
  importSummary: {
    file_count: 0,
    imported_count: 0,
    deduplicated_count: 0,
    duplicate_count: 0,
    source_filenames: [],
  },
  selectedImportFiles: [],
  runAfterIndex: 0,
  runResultsBySequence: new Map(),
  runResultsTotal: 0,
  runResultsPage: 1,
  runResultsPageSize: 30,
  runStatus: {
    status: "prepared",
    status_a: "prepared",
    status_b: "prepared",
    counts_a: { total: 0, completed: 0, yes: 0, no: 0, maybe: 0, errors: 0, pending: 0 },
    counts_b: { total: 0, completed: 0, yes: 0, no: 0, maybe: 0, errors: 0, pending: 0 },
  },
  reviewModelA: "",
  reviewModelB: "",
  reviewItems: [],
  reviewFilteredItems: [],
  selectedReviewItemId: null,
  reviewDraft: { judgment: null, reason: "" },
  reviewConsensusDefaultFocus: true,
  reviewInclusionExpanded: false,
  reviewExclusionExpanded: false,
};

window.addEventListener("load", applyCriterionTextareaSizing);
window.addEventListener("resize", applyCriterionTextareaSizing);
if (document.fonts?.ready) {
  document.fonts.ready.then(() => applyCriterionTextareaSizing());
}

if (projectForm) {
  projectForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await saveProject(false);
  });
}

if (saveProjectNextButton) {
  saveProjectNextButton.addEventListener("click", async () => {
    await saveProject(true);
  });
}

if (projectModelAInput) {
  projectModelAInput.addEventListener("change", () => {
    state.modelA = projectModelAInput.value || state.modelA;
    updateProjectModelDisplay();
    renderApiKeySettings();
  });
}

if (projectModelBInput) {
  projectModelBInput.addEventListener("change", () => {
    state.modelB = projectModelBInput.value || state.modelB;
    updateProjectModelDisplay();
    renderApiKeySettings();
  });
}

if (apiSettingsCard) {
  apiSettingsCard.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const button = target.closest("[data-save-api-key-provider]");
    if (!(button instanceof HTMLButtonElement)) {
      return;
    }
    const provider = button.dataset.saveApiKeyProvider || "";
    if (!provider) {
      return;
    }
    await saveApiKey(provider);
  });
}

if (addInclusionButton) {
  addInclusionButton.addEventListener("click", () => {
    syncCriteriaFromDom();
    state.inclusionCriteria.push({ id: "", text: "" });
    renderCriteria({ focusKind: "inclusion", focusIndex: state.inclusionCriteria.length - 1 });
  });
}

if (addExclusionButton) {
  addExclusionButton.addEventListener("click", () => {
    syncCriteriaFromDom();
    state.exclusionCriteria.push({ id: "", text: "" });
    renderCriteria({ focusKind: "exclusion", focusIndex: state.exclusionCriteria.length - 1 });
  });
}

if (inclusionList) {
  inclusionList.addEventListener("click", handleCriterionDelete);
  inclusionList.addEventListener("input", handleCriterionInput);
}

if (exclusionList) {
  exclusionList.addEventListener("click", handleCriterionDelete);
  exclusionList.addEventListener("input", handleCriterionInput);
}

if (saveCriteriaButton) {
  saveCriteriaButton.addEventListener("click", async () => {
    await saveCriteria(false);
  });
}

if (saveCriteriaNextButton) {
  saveCriteriaNextButton.addEventListener("click", async () => {
    await saveCriteria(true);
  });
}

if (importDropzone) {
  importDropzone.addEventListener("click", () => risFilesInput?.click());
  importDropzone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      risFilesInput?.click();
    }
  });
  importDropzone.addEventListener("dragenter", handleImportDragEnter);
  importDropzone.addEventListener("dragover", handleImportDragOver);
  importDropzone.addEventListener("dragleave", handleImportDragLeave);
  importDropzone.addEventListener("drop", handleImportDrop);
}

if (risFilesInput) {
  risFilesInput.addEventListener("change", () => {
    setSelectedImportFiles(Array.from(risFilesInput.files || []));
  });
}

if (importButton) {
  importButton.addEventListener("click", async () => {
    await importRisFiles();
  });
}

if (runButton) {
  runButton.addEventListener("click", async () => {
    const status = state.runStatus?.status;
    if (status === "completed" || status === "failed") {
      const confirmed = await showConfirm(
        "Existing results will be discarded and screening will start from scratch.",
        {
          eyebrow: "Rerun screening",
          title: "Rerun and overwrite existing results?",
          confirmLabel: "Rerun",
          danger: true,
        },
      );
      if (!confirmed) return;
    }
    await startRun();
  });
}

if (resumeAButton) {
  resumeAButton.addEventListener("click", async () => {
    await resumeModel("a");
  });
}

if (resumeBButton) {
  resumeBButton.addEventListener("click", async () => {
    await resumeModel("b");
  });
}

if (createReviewProjectButton) {
  createReviewProjectButton.addEventListener("click", async () => {
    await createReviewProjectFromRun();
  });
}

if (exportToggleButton && exportMenu) {
  exportToggleButton.addEventListener("click", (event) => {
    event.stopPropagation();
    if (exportToggleButton.disabled) return;
    const expanded = exportToggleButton.getAttribute("aria-expanded") === "true";
    setExportMenuOpen(!expanded);
  });
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (exportActions && !exportActions.contains(target)) {
      setExportMenuOpen(false);
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setExportMenuOpen(false);
  });
  exportMenu.addEventListener("click", (event) => {
    const target = event.target;
    if (target instanceof HTMLElement && target.closest(".export-menu-link")) {
      setExportMenuOpen(false);
    }
  });
}

function setExportMenuOpen(open) {
  if (!exportMenu || !exportToggleButton) return;
  exportMenu.classList.toggle("hidden", !open);
  exportToggleButton.setAttribute("aria-expanded", open ? "true" : "false");
}

if (resultsPrevButton) {
  resultsPrevButton.addEventListener("click", () => {
    if (state.runResultsPage > 1) {
      state.runResultsPage -= 1;
      renderRunResultsPage();
    }
  });
}

if (resultsNextButton) {
  resultsNextButton.addEventListener("click", () => {
    const totalPages = getRunResultsPageCount();
    if (state.runResultsPage < totalPages) {
      state.runResultsPage += 1;
      renderRunResultsPage();
    }
  });
}

if (reviewFilterA) {
  reviewFilterA.addEventListener("change", () => {
    state.reviewConsensusDefaultFocus = false;
    renderReviewWorkspace();
  });
}

if (reviewFilterB) {
  reviewFilterB.addEventListener("change", () => {
    state.reviewConsensusDefaultFocus = false;
    renderReviewWorkspace();
  });
}

if (reviewFilterConsensus) {
  reviewFilterConsensus.addEventListener("change", () => {
    state.reviewConsensusDefaultFocus = false;
    renderReviewWorkspace();
  });
}

if (reviewFilterHuman) {
  reviewFilterHuman.addEventListener("change", () => {
    state.reviewConsensusDefaultFocus = false;
    renderReviewWorkspace();
  });
}

if (reviewSearch) {
  reviewSearch.addEventListener("input", () => {
    state.reviewConsensusDefaultFocus = false;
    renderReviewWorkspace();
  });
}

if (reviewList) {
  reviewList.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const button = target.closest("[data-review-item-id]");
    if (!(button instanceof HTMLElement)) {
      return;
    }
    selectReviewItem(button.dataset.reviewItemId || "");
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key !== "ArrowUp" && event.key !== "ArrowDown") {
    return;
  }
  const target = event.target;
  if (target instanceof HTMLElement) {
    const tag = target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable) {
      return;
    }
  }
  if (!reviewShell || reviewShell.classList.contains("hidden")) {
    return;
  }
  const items = state.reviewFilteredItems || [];
  if (!items.length) {
    return;
  }
  const idx = items.findIndex((item) => item.item_id === state.selectedReviewItemId);
  let nextIdx;
  if (idx < 0) {
    nextIdx = 0;
  } else if (event.key === "ArrowDown") {
    nextIdx = Math.min(items.length - 1, idx + 1);
  } else {
    nextIdx = Math.max(0, idx - 1);
  }
  if (nextIdx === idx) {
    return;
  }
  event.preventDefault();
  selectReviewItem(items[nextIdx].item_id);
  scrollSelectedReviewItemIntoView();
});

function scrollSelectedReviewItemIntoView() {
  if (!reviewList) return;
  const el = reviewList.querySelector(`[data-review-item-id="${state.selectedReviewItemId}"]`);
  if (el && typeof el.scrollIntoView === "function") {
    el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
}

if (reviewHumanYesButton) {
  reviewHumanYesButton.addEventListener("click", () => setReviewDraftJudgment("yes"));
}

if (reviewHumanMaybeButton) {
  reviewHumanMaybeButton.addEventListener("click", () => setReviewDraftJudgment("maybe"));
}

if (reviewHumanNoButton) {
  reviewHumanNoButton.addEventListener("click", () => setReviewDraftJudgment("no"));
}

if (reviewHumanReasonInput) {
  reviewHumanReasonInput.addEventListener("input", () => {
    state.reviewDraft.reason = reviewHumanReasonInput.value;
  });
}

if (reviewSaveButton) {
  reviewSaveButton.addEventListener("click", async () => {
    await saveReviewDecision();
  });
}

if (reviewInclusionToggle) {
  reviewInclusionToggle.addEventListener("click", () => {
    state.reviewInclusionExpanded = !state.reviewInclusionExpanded;
    syncReviewCriteriaToggles();
  });
}
if (reviewExclusionToggle) {
  reviewExclusionToggle.addEventListener("click", () => {
    state.reviewExclusionExpanded = !state.reviewExclusionExpanded;
    syncReviewCriteriaToggles();
  });
}

if (reviewAdoptAgreeButton) {
  reviewAdoptAgreeButton.addEventListener("click", async () => {
    await adoptAgreeItems();
  });
}

function getSelectedModels() {
  const modelA = projectModelAInput?.value || state.modelA || window.defaultModelA || "qwen3.6-flash";
  const modelB = projectModelBInput?.value || state.modelB || window.defaultModelB || "deepseek-v4-flash";
  return { modelA, modelB };
}

function updateProjectModelDisplay() {
  const { modelA, modelB } = getSelectedModels();
  if (projectModelAPill) {
    projectModelAPill.textContent = `A: ${modelA}`;
  }
  if (projectModelBPill) {
    projectModelBPill.textContent = `B: ${modelB}`;
  }
  if (runModelCopy) {
    runModelCopy.textContent = `Model A (${modelA}) and Model B (${modelB}) run independently in parallel.`;
  }
}

async function saveProject(redirectAfterSave) {
  const { modelA, modelB } = getSelectedModels();
  const payload = {
    name: projectNameInput?.value.trim() || "",
    description: projectDescriptionInput?.value.trim() || "",
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

  setProjectBusy(true, "Saving project...");
  try {
    const response = await fetch(`/api/projects/${projectId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await parseJsonSafely(response);
    if (!response.ok) {
      window.alert(formatApiError(data, "Failed to save project."));
      setProjectBusy(false, "Save failed.");
      return;
    }

    hydrateProject(data);
    setProjectBusy(false, "Project saved.");
    if (redirectAfterSave && nextStep) {
      window.location.href = `/projects/${projectId}/${nextStep}`;
    }
  } catch (error) {
    console.error(error);
    setProjectBusy(false, "Save failed.");
    window.alert("Could not reach the backend while saving the project.");
  }
}

async function loadApiKeyStatuses() {
  if (!apiSettingsCard) {
    return;
  }
  try {
    const response = await fetch("/api/settings/api-keys");
    const payload = await parseJsonSafely(response);
    if (response.ok) {
      state.apiKeyStatuses = Object.fromEntries((payload.providers || []).map((item) => [item.provider, item]));
    }
  } catch (error) {
    console.error(error);
  }
  renderApiKeySettings();
}

function renderApiKeySettings() {
  if (!apiSettingsCard) {
    return;
  }

  const { modelA, modelB } = getSelectedModels();
  const providerEntries = [
    { provider: getProviderForModel(modelA), model: modelA, slot: "A" },
    { provider: getProviderForModel(modelB), model: modelB, slot: "B" },
  ];
  const uniqueProviders = [];
  for (const entry of providerEntries) {
    if (!uniqueProviders.some((item) => item.provider === entry.provider)) {
      uniqueProviders.push(entry);
    }
  }

  apiSettingsCard.innerHTML = uniqueProviders
    .map((entry) => {
      const status = state.apiKeyStatuses[entry.provider];
      const label = getProviderLabel(entry.provider);
      const modelHints = providerEntries
        .filter((item) => item.provider === entry.provider)
        .map((item) => `Model ${item.slot}: ${item.model}`)
        .join(" · ");
      const savedBadge = status?.has_api_key
        ? `<div class="api-key-saved-banner">
             <span class="api-key-saved-badge">✓ Saved</span>
             <span class="api-key-preview">${escapeHtml(status.key_preview || "")}</span>
             <span class="muted">Stored on this computer — shared across all projects for this app.</span>
           </div>`
        : "";
      const helperText = status?.has_api_key
        ? "Only paste a new key if you need to replace the saved one."
        : "Paste the key and click Test API key to verify it works.";
      return `
        <article class="detail-card stack">
          <div>
            <h3>${escapeHtml(label)} API key</h3>
            <p class="muted">${escapeHtml(modelHints)}</p>
            ${savedBadge}
            <p class="muted">${helperText}</p>
          </div>
          <label class="field">
            <span>${status?.has_api_key ? "Replace API key (optional)" : "API key"}</span>
            <input id="api-key-input-${entry.provider}" type="password" placeholder="Paste ${escapeHtml(label)} key" autocomplete="off" data-lpignore="true" data-1p-ignore="true" />
          </label>
          <div class="actions">
            <button type="button" class="secondary" data-save-api-key-provider="${entry.provider}">Test API key</button>
            <span id="api-key-status-${entry.provider}" class="muted"></span>
          </div>
        </article>
      `;
    })
    .join("");
}

async function saveApiKey(provider) {
  const input = document.getElementById(`api-key-input-${provider}`);
  const statusNode = document.getElementById(`api-key-status-${provider}`);
  if (!(input instanceof HTMLInputElement)) {
    return;
  }

  const apiKey = input.value.trim();
  if (!apiKey) {
    window.alert(`Paste a ${getProviderLabel(provider)} API key first.`);
    return;
  }

  const modelForProvider = pickProviderModel(provider);
  const saveButton = apiSettingsCard?.querySelector(`[data-save-api-key-provider="${provider}"]`);
  if (saveButton instanceof HTMLButtonElement) {
    saveButton.disabled = true;
    saveButton.textContent = "Testing...";
  }
  if (statusNode) {
    statusNode.textContent = `Testing ${getProviderLabel(provider)} key...`;
  }

  try {
    const response = await fetch("/api/settings/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider,
        api_key: apiKey,
        model: modelForProvider,
      }),
    });
    const payload = await parseJsonSafely(response);
    if (!response.ok) {
      const message = formatApiError(payload, "API key test failed.");
      if (statusNode) {
        statusNode.textContent = message;
      }
      window.alert(message);
      return;
    }

    state.apiKeyStatuses[payload.provider] = payload;
    input.value = "";
    if (statusNode) {
      statusNode.textContent = payload.message || "API key saved.";
    }
  } catch (error) {
    console.error(error);
    if (statusNode) {
      statusNode.textContent = "Could not reach backend while testing API key.";
    }
    window.alert("Could not reach backend while testing API key.");
  } finally {
    if (saveButton instanceof HTMLButtonElement) {
      saveButton.disabled = false;
      saveButton.textContent = "Test API key";
    }
  }
}

function pickProviderModel(provider) {
  const { modelA, modelB } = getSelectedModels();
  if (getProviderForModel(modelA) === provider) {
    return modelA;
  }
  return modelB;
}

function getProviderForModel(model) {
  return String(model || "").startsWith("deepseek-") ? "deepseek" : "dashscope";
}

function getProviderLabel(provider) {
  return provider === "deepseek" ? "DeepSeek" : "DashScope";
}

function setProjectBusy(isBusy, message = "") {
  if (projectFormStatus) {
    projectFormStatus.textContent = message;
  }
  const submit = projectForm?.querySelector('button[type="submit"]');
  if (submit instanceof HTMLButtonElement) {
    submit.disabled = isBusy;
  }
  if (saveProjectNextButton) {
    saveProjectNextButton.disabled = isBusy;
  }
}

function handleCriterionDelete(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement) || !target.matches("[data-remove-index]")) {
    return;
  }

  syncCriteriaFromDom();
  const index = Number(target.dataset.removeIndex);
  const kind = target.dataset.kind;
  const label = kind === "inclusion" ? "inclusion" : "exclusion";
  const confirmed = window.confirm(`Remove this ${label} criterion? This cannot be undone.`);
  if (!confirmed) {
    return;
  }

  if (kind === "inclusion") {
    state.inclusionCriteria.splice(index, 1);
  } else if (kind === "exclusion") {
    state.exclusionCriteria.splice(index, 1);
  }
  renderCriteria();
}

function handleCriterionInput(event) {
  const target = event.target;
  if (!(target instanceof HTMLTextAreaElement) || !target.classList.contains("criterion-text")) {
    return;
  }
  autoResizeTextarea(target);
}

async function saveCriteria(redirectAfterSave) {
  syncCriteriaFromDom();
  const inclusionCriteria = normalizeCriteria(state.inclusionCriteria, "I");
  const exclusionCriteria = normalizeCriteria(state.exclusionCriteria, "E");
  if (!inclusionCriteria.length || !exclusionCriteria.length) {
    window.alert("Add at least one inclusion criterion and one exclusion criterion.");
    return;
  }

  setCriteriaBusy(true, "Saving criteria...");
  try {
    const response = await fetch(`/api/projects/${projectId}/criteria`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inclusion_criteria: inclusionCriteria,
        exclusion_criteria: exclusionCriteria,
      }),
    });
    const payload = await parseJsonSafely(response);
    if (!response.ok) {
      window.alert(formatApiError(payload, "Failed to save criteria."));
      setCriteriaBusy(false, "Save failed.");
      return;
    }

    hydrateProject(payload);
    setCriteriaBusy(false, "Criteria saved.");
    if (redirectAfterSave && nextStep) {
      window.location.href = `/projects/${projectId}/${nextStep}`;
    }
  } catch (error) {
    console.error(error);
    setCriteriaBusy(false, "Save failed.");
    window.alert("Could not reach the backend while saving criteria.");
  }
}

function setCriteriaBusy(isBusy, message = "") {
  if (saveCriteriaButton) {
    saveCriteriaButton.disabled = isBusy;
  }
  if (saveCriteriaNextButton) {
    saveCriteriaNextButton.disabled = isBusy;
  }
  if (addInclusionButton) {
    addInclusionButton.disabled = isBusy;
  }
  if (addExclusionButton) {
    addExclusionButton.disabled = isBusy;
  }
  if (criteriaStatus) {
    criteriaStatus.textContent = message;
  }
}

function normalizeCriteria(items, prefix) {
  return items
    .map((item) => String(item.text || "").trim())
    .filter(Boolean)
    .map((text, index) => ({
      id: `${prefix}${index + 1}`,
      text,
    }));
}

function syncCriteriaFromDom() {
  if (inclusionList) {
    state.inclusionCriteria = readCriterionGroup(inclusionList, "I");
  }
  if (exclusionList) {
    state.exclusionCriteria = readCriterionGroup(exclusionList, "E");
  }
}

function readCriterionGroup(container, prefix) {
  return Array.from(container.querySelectorAll(".criterion-card")).map((card, index) => ({
    id: `${prefix}${index + 1}`,
    text: card.querySelector(".criterion-text")?.value?.trim() || "",
  }));
}

function renderCriteria(options = {}) {
  if (inclusionList) {
    inclusionList.innerHTML = renderCriterionGroup(state.inclusionCriteria, "inclusion", "I");
  }
  if (exclusionList) {
    exclusionList.innerHTML = renderCriterionGroup(state.exclusionCriteria, "exclusion", "E");
  }
  window.requestAnimationFrame(() => {
    applyCriterionTextareaSizing();
    focusCriterionTextarea(options);
  });
}

function renderCriterionGroup(items, kind, prefix) {
  if (!items.length) {
    return `<article class="empty-card compact-empty"><h3>No criteria yet</h3><p>Add the first ${kind} criterion.</p></article>`;
  }
  return items
    .map(
      (item, index) => `
        <article class="criterion-card" data-kind="${kind}" data-index="${index}">
          <div class="criterion-card-top">
            <span class="pill subtle">${escapeHtml(item.id || `${prefix}${index + 1}`)}</span>
            <button type="button" class="icon-button" data-kind="${kind}" data-remove-index="${index}">Remove</button>
          </div>
          <label class="field">
            <span>Criterion text</span>
            <textarea class="criterion-text" rows="1" placeholder="Enter the criterion exactly as it should be used">${escapeHtml(item.text || "")}</textarea>
          </label>
        </article>
      `,
    )
    .join("");
}

function applyCriterionTextareaSizing() {
  for (const textarea of document.querySelectorAll(".criterion-text")) {
    if (textarea instanceof HTMLTextAreaElement) {
      autoResizeTextarea(textarea);
    }
  }
}

function autoResizeTextarea(textarea) {
  textarea.style.height = "auto";
  textarea.style.height = `${Math.max(textarea.scrollHeight, 72)}px`;
}

function focusCriterionTextarea(options) {
  const { focusKind, focusIndex } = options;
  if (!focusKind || typeof focusIndex !== "number") {
    return;
  }
  const selector = `.criterion-card[data-kind="${focusKind}"][data-index="${focusIndex}"] .criterion-text`;
  const textarea = document.querySelector(selector);
  if (textarea instanceof HTMLTextAreaElement) {
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    textarea.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function handleImportDragEnter(event) {
  event.preventDefault();
  importDropzone?.classList.add("drag-active");
}

function handleImportDragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = "copy";
  importDropzone?.classList.add("drag-active");
}

function handleImportDragLeave(event) {
  event.preventDefault();
  if (
    !(event.currentTarget instanceof HTMLElement)
    || !(event.relatedTarget instanceof Node)
    || !event.currentTarget.contains(event.relatedTarget)
  ) {
    importDropzone?.classList.remove("drag-active");
  }
}

function handleImportDrop(event) {
  event.preventDefault();
  importDropzone?.classList.remove("drag-active");
  const droppedFiles = Array.from(event.dataTransfer?.files || []).filter((file) => file.name.toLowerCase().endsWith(".ris"));
  if (!droppedFiles.length) {
    window.alert("Drop one or more .ris files.");
    return;
  }
  assignFilesToInput(droppedFiles);
}

async function importRisFiles() {
  if (!risFilesInput || !risFilesInput.files.length) {
    window.alert("Select at least one RIS file.");
    return;
  }

  setImportBusy(true, "Importing RIS files...");
  const formData = new FormData();
  for (const file of risFilesInput.files) {
    formData.append("files", file);
  }

  try {
    const response = await fetch(`/api/projects/${projectId}/import-ris`, { method: "POST", body: formData });
    const payload = await parseJsonSafely(response);
    if (!response.ok) {
      window.alert(formatApiError(payload, "Failed to import RIS."));
      setImportBusy(false, "Import failed.");
      return;
    }
    state.importSummary = payload.import_summary || state.importSummary;
    updateImportSummary(state.importSummary);
    updateImportNextState();
    state.selectedImportFiles = [];
    if (risFilesInput) risFilesInput.value = "";
    renderSelectedFiles();
    setImportBusy(false, "");
  } catch (error) {
    console.error(error);
    setImportBusy(false, "Import failed.");
    window.alert("Could not reach the backend while importing RIS files.");
  }
}

function setImportBusy(isBusy, message = "") {
  if (importButton) {
    importButton.disabled = isBusy;
    importButton.textContent = isBusy ? "Importing..." : "Import RIS files";
  }
  if (importDropzone) {
    importDropzone.classList.toggle("busy", isBusy);
  }
  if (importStatus) {
    importStatus.textContent = message;
  }
}

function updateImportSummary(summary) {
  setStat("summary-files", summary.file_count || 0);
  setStat("summary-imported", summary.imported_count || 0);
  setStat("summary-unique", summary.deduplicated_count || 0);
  setStat("summary-duplicates", summary.duplicate_count || 0);
  renderImportedFilesPanel(summary.source_filenames || []);
  const card = document.getElementById("current-import-card");
  if (card) {
    card.classList.toggle("hidden", !(summary.imported_count || summary.file_count));
  }
}

function renderImportedFilesPanel(filenames) {
  const panel = document.getElementById("imported-files-panel");
  const list = document.getElementById("imported-files-list");
  if (!panel || !list) {
    return;
  }
  if (!filenames.length) {
    panel.classList.add("hidden");
    list.innerHTML = "";
    return;
  }
  panel.classList.remove("hidden");
  list.innerHTML = filenames
    .map(
      (name) => `
        <li>
          <span class="imported-file-icon">RIS</span>
          <span class="imported-file-name">${escapeHtml(name)}</span>
          <button type="button" class="icon-button imported-file-remove" data-remove-import="${escapeHtml(name)}" aria-label="Delete ${escapeHtml(name)}">Remove</button>
        </li>
      `,
    )
    .join("");
  for (const button of list.querySelectorAll("[data-remove-import]")) {
    button.addEventListener("click", async () => {
      const name = button.getAttribute("data-remove-import") || "";
      if (!name) return;
      const confirmed = await showConfirm(
        "Papers contributed only by this file will be removed. Papers shared with other files will be kept.",
        {
          eyebrow: "Delete imported file",
          title: "Delete this imported file?",
          subject: name,
          confirmLabel: "Delete",
          danger: true,
        },
      );
      if (!confirmed) return;
      await deleteImportedSource(name);
    });
  }
}

async function deleteImportedSource(filename) {
  try {
    const response = await fetch(
      `/api/projects/${projectId}/imports/${encodeURIComponent(filename)}`,
      { method: "DELETE" },
    );
    const payload = await parseJsonSafely(response);
    if (!response.ok) {
      window.alert(formatApiError(payload, "Failed to delete imported file."));
      return;
    }
    state.importSummary = payload.import_summary || state.importSummary;
    updateImportSummary(state.importSummary);
    updateImportNextState();
  } catch (error) {
    console.error(error);
    window.alert("Could not reach the backend while deleting the imported file.");
  }
}

function updateImportNextState() {
  const isReady = (state.importSummary.deduplicated_count || 0) > 0;
  if (importNextLink) {
    importNextLink.setAttribute("aria-disabled", isReady ? "false" : "true");
  }
  setLinkState(
    importExportDedupedRisLink,
    isReady ? `/api/projects/${projectId}/imports/deduplicated.ris` : "#",
    isReady,
  );
}

function setSelectedImportFiles(files) {
  state.selectedImportFiles = files;
  assignFilesToInput(files, { skipStateUpdate: true });
  renderSelectedFiles();
}

function assignFilesToInput(files, options = {}) {
  if (!risFilesInput) {
    return;
  }
  const transfer = new DataTransfer();
  for (const file of files) {
    transfer.items.add(file);
  }
  risFilesInput.files = transfer.files;
  if (!options.skipStateUpdate) {
    state.selectedImportFiles = Array.from(risFilesInput.files || []);
    renderSelectedFiles();
  }
}

function renderSelectedFiles() {
  if (!selectedFiles) {
    return;
  }
  const files = state.selectedImportFiles;
  const actionRow = document.getElementById("import-action-row");
  if (!files.length) {
    selectedFiles.innerHTML = "";
    selectedFiles.classList.add("hidden");
    if (actionRow) actionRow.classList.add("hidden");
    return;
  }
  selectedFiles.classList.remove("hidden");
  if (actionRow) actionRow.classList.remove("hidden");

  const totalSizeMb = (files.reduce((sum, file) => sum + file.size, 0) / (1024 * 1024)).toFixed(2);
  selectedFiles.innerHTML = `
    <div class="selected-files-header">
      <div>
        <h3>${files.length === 1 ? "1 file selected" : `${files.length} files selected`}</h3>
        <p class="muted">${totalSizeMb} MB total</p>
      </div>
      <button id="clear-selected-files-button" type="button" class="secondary">Clear</button>
    </div>
    <div class="selected-files-list">
      ${files
        .map(
          (file, index) => `
            <article class="selected-file-row">
              <strong>${escapeHtml(file.name)}</strong>
              <span class="muted">${formatFileSize(file.size)}</span>
              <button type="button" class="icon-button selected-file-remove" data-remove-file-index="${index}" aria-label="Remove ${escapeHtml(file.name)}">Remove</button>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
  const clearButton = document.getElementById("clear-selected-files-button");
  if (clearButton) {
    clearButton.addEventListener("click", () => {
      state.selectedImportFiles = [];
      if (risFilesInput) {
        risFilesInput.value = "";
      }
      renderSelectedFiles();
    });
  }
  for (const removeButton of selectedFiles.querySelectorAll("[data-remove-file-index]")) {
    removeButton.addEventListener("click", () => {
      const index = Number(removeButton.getAttribute("data-remove-file-index"));
      if (!Number.isInteger(index)) {
        return;
      }
      const next = state.selectedImportFiles.filter((_, i) => i !== index);
      setSelectedImportFiles(next);
    });
  }
}

async function startRun() {
  setRunBusy(true);
  try {
    const response = await fetch(`/api/projects/${projectId}/runs`, { method: "POST" });
    const payload = await parseJsonSafely(response);
    if (!response.ok) {
      window.alert(formatApiError(payload, "Failed to start screening."));
      setRunBusy(false);
      return;
    }
    if (state.latestRunId !== payload.run_id) {
      resetRunState(payload.run_id);
    }
    state.latestRunId = payload.run_id;
    if (runMeta) {
      runMeta.textContent = `Run ${payload.run_id} started.`;
    }
    updateStatusPill("running");
    startPolling();
  } catch (error) {
    console.error(error);
    setRunBusy(false);
    window.alert("Could not reach backend while starting screening.");
  }
}

async function resumeModel(slot) {
  if (!state.latestRunId) {
    return;
  }
  const button = slot === "a" ? resumeAButton : resumeBButton;
  if (button instanceof HTMLButtonElement) {
    button.disabled = true;
    button.textContent = slot === "a" ? "Resuming A..." : "Resuming B...";
  }
  try {
    const response = await fetch(`/api/runs/${state.latestRunId}/models/${slot}/resume`, { method: "POST" });
    const payload = await parseJsonSafely(response);
    if (!response.ok) {
      window.alert(formatApiError(payload, "Failed to resume model."));
      return;
    }
    startPolling();
  } catch (error) {
    console.error(error);
    window.alert("Could not reach backend while resuming this model.");
  } finally {
    syncResumeButtons();
  }
}

function setRunBusy(isBusy) {
  if (!runButton) {
    return;
  }
  runButton.disabled = isBusy;
  runButton.textContent = isBusy ? "Screening in progress..." : "Run screening";
}

const POLL_INTERVAL_ACTIVE = 1500;
const POLL_INTERVAL_HIDDEN = 5000;
const POLL_BACKOFF_CAP = 15000;

function startPolling() {
  stopPolling();
  state.pollFailures = 0;
  pollRunStatus();
}

function stopPolling() {
  if (state.pollTimer) {
    window.clearTimeout(state.pollTimer);
    state.pollTimer = null;
  }
}

function schedulePoll(delay) {
  if (state.pollTimer) {
    window.clearTimeout(state.pollTimer);
  }
  state.pollTimer = window.setTimeout(pollRunStatus, delay);
}

function isTerminalRunStatus(status) {
  return status === "completed" || status === "failed" || status === "cancelled";
}

async function pollRunStatus() {
  if (!state.latestRunId) {
    return;
  }
  try {
    const response = await fetch(`/api/runs/${state.latestRunId}/status?after_index=${state.runAfterIndex}`);
    const payload = await parseJsonSafely(response);
    if (!response.ok) {
      handlePollFailure();
      return;
    }
    state.pollFailures = 0;
    applyRunStatus(payload);
    if (isTerminalRunStatus(payload.status)) {
      stopPolling();
      return;
    }
    schedulePoll(document.hidden ? POLL_INTERVAL_HIDDEN : POLL_INTERVAL_ACTIVE);
  } catch (error) {
    console.error(error);
    handlePollFailure();
  }
}

function handlePollFailure() {
  state.pollFailures = (state.pollFailures || 0) + 1;
  // Exponential backoff capped at POLL_BACKOFF_CAP. Keep polling — a transient
  // blip must not freeze the UI indefinitely.
  const base = document.hidden ? POLL_INTERVAL_HIDDEN : POLL_INTERVAL_ACTIVE;
  const delay = Math.min(base * 2 ** Math.min(state.pollFailures - 1, 4), POLL_BACKOFF_CAP);
  schedulePoll(delay);
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) return;
  if (!state.latestRunId) return;
  if (isTerminalRunStatus(state.runStatus?.status)) return;
  // Tab came back — poll right away so the user sees fresh state.
  schedulePoll(0);
});

function applyRunStatus(payload) {
  state.runStatus = payload;
  state.runAfterIndex = Number(payload.result_count || state.runAfterIndex || 0);
  const total = Math.max(Number(payload.counts_a?.total || 0), Number(payload.counts_b?.total || 0));
  initializeRunResultPlaceholders(total);
  appendRunResultUpdates(payload.new_results || []);

  updateRunModelHeader(payload);
  updateStatusPill(payload.status);
  updateModelProgress("a", payload);
  updateModelProgress("b", payload);
  updateRunExportLinks(payload);
  syncResumeButtons(payload);
  syncCreateReviewProjectButton(payload);
  renderRunResultsPage();
  syncRunResultsVisibility();

  if (runMeta) {
    runMeta.textContent = `Run ${payload.run_id} · overall ${payload.status} · A ${payload.status_a} · B ${payload.status_b}`;
  }
  setRunBusy(payload.status === "running");
}

function updateRunModelHeader(payload) {
  if (progressLabelA) {
    progressLabelA.textContent = `Model A: ${payload.model_a}`;
  }
  if (progressLabelB) {
    progressLabelB.textContent = `Model B: ${payload.model_b}`;
  }
}

function updateModelProgress(slot, payload) {
  const suffix = slot === "a" ? "a" : "b";
  const status = payload[`status_${suffix}`];
  const counts = payload[`counts_${suffix}`] || {};
  const progress = Number(payload[`progress_percent_${suffix}`] || 0);
  const errorMessage = payload[`last_error_${suffix}`];

  const statusNode = slot === "a" ? progressStatusA : progressStatusB;
  const progressNode = slot === "a" ? progressBarA : progressBarB;
  const progressTextNode = slot === "a" ? progressTextA : progressTextB;
  const errorNode = slot === "a" ? lastErrorA : lastErrorB;

  if (statusNode) {
    statusNode.textContent = status;
    statusNode.className = `pill status-${status}`;
  }
  if (progressNode) {
    progressNode.style.width = `${Math.max(0, Math.min(100, progress)).toFixed(0)}%`;
  }
  if (progressTextNode) {
    progressTextNode.textContent = `${Math.max(0, Math.min(100, progress)).toFixed(0)}%`;
  }
  if (errorNode) {
    errorNode.textContent = errorMessage ? `Last error: ${errorMessage}` : "";
  }

  setStat(`stat-total-${suffix}`, counts.total || 0);
  setStat(`stat-completed-${suffix}`, counts.completed || 0);
  setStat(`stat-yes-${suffix}`, counts.yes || 0);
  setStat(`stat-no-${suffix}`, counts.no || 0);
  setStat(`stat-maybe-${suffix}`, counts.maybe || 0);
  setStat(`stat-errors-${suffix}`, counts.errors || 0);
}

function initializeRunResultPlaceholders(total) {
  const currentTotal = Number(total || 0);
  if (!currentTotal || currentTotal <= state.runResultsTotal) {
    return;
  }
  for (let sequence = state.runResultsTotal + 1; sequence <= currentTotal; sequence += 1) {
    state.runResultsBySequence.set(sequence, {
      sequence,
      source_id: "",
      title: `Pending #${sequence}`,
      doi: "",
      year: "",
      journal: "",
      judgment_a: null,
      judgment_b: null,
      consensus: "pending",
    });
  }
  state.runResultsTotal = currentTotal;
}

function appendRunResultUpdates(rows) {
  for (const row of rows) {
    const sequence = Number(row.sequence || 0);
    if (!sequence) {
      continue;
    }
    const previous = state.runResultsBySequence.get(sequence) || {};
    state.runResultsBySequence.set(sequence, {
      ...previous,
      ...row,
      sequence,
      title: row.title || previous.title || `Pending #${sequence}`,
      consensus: row.consensus || previous.consensus || "pending",
    });
  }
}

function getRunResultsArray() {
  return Array.from(state.runResultsBySequence.values()).sort((a, b) => Number(a.sequence || 0) - Number(b.sequence || 0));
}

function renderRunResultsPage() {
  if (!resultsTableBody) {
    return;
  }
  const rows = getRunResultsArray();
  const totalPages = getRunResultsPageCount(rows.length);
  state.runResultsPage = Math.min(Math.max(state.runResultsPage, 1), totalPages);
  const startIndex = (state.runResultsPage - 1) * state.runResultsPageSize;
  const visibleRows = rows.slice(startIndex, startIndex + state.runResultsPageSize);

  resultsTableBody.innerHTML = visibleRows
    .map(
      (row) => `
        <tr>
          <td class="title-cell">${escapeHtml(row.title || "")}</td>
          <td>${escapeHtml(row.doi || "")}</td>
          <td>${escapeHtml(row.year || "")}</td>
          <td>${escapeHtml(row.journal || "")}</td>
          <td>${renderJudgmentChip(row.judgment_a)}</td>
          <td>${renderJudgmentChip(row.judgment_b)}</td>
          <td>${renderConsensusChip(row.consensus)}</td>
        </tr>
      `,
    )
    .join("");

  if (resultsPageMeta) {
    resultsPageMeta.textContent = `Page ${rows.length ? state.runResultsPage : 0} of ${totalPages}`;
  }
  if (resultsPrevButton) {
    resultsPrevButton.disabled = state.runResultsPage <= 1;
  }
  if (resultsNextButton) {
    resultsNextButton.disabled = state.runResultsPage >= totalPages;
  }
  if (resultsCountPill) {
    resultsCountPill.textContent = rows.length === 1 ? "1 row" : `${rows.length} rows`;
  }
}

function getRunResultsPageCount(totalRows = getRunResultsArray().length) {
  return Math.max(1, Math.ceil(totalRows / state.runResultsPageSize));
}

function renderJudgmentChip(judgment) {
  if (!judgment) {
    return `<span class="pill subtle">Pending</span>`;
  }
  return `<span class="judgment-chip judgment-${escapeHtml(judgment)}">${escapeHtml(judgment)}</span>`;
}

function renderConsensusChip(consensus) {
  const normalized = consensus || "pending";
  const label = getConsensusLabel(normalized);
  const icon = getConsensusIcon(normalized);
  return `<span class="pill subtle">${icon} ${escapeHtml(label)}</span>`;
}

function getConsensusLabel(consensus) {
  if (consensus === "agree") return "Agree";
  if (consensus === "partial") return "Partial";
  if (consensus === "conflict") return "Conflict";
  return "Pending";
}

function getConsensusIcon(consensus) {
  if (consensus === "agree") return "🟢";
  if (consensus === "partial") return "🟡";
  if (consensus === "conflict") return "🔴";
  return "⚪";
}

function syncRunResultsVisibility() {
  const hasRows = getRunResultsArray().length > 0;
  if (resultsEmpty) {
    resultsEmpty.classList.toggle("hidden", hasRows);
  }
  if (resultsTableShell) {
    resultsTableShell.classList.toggle("hidden", !hasRows);
  }
  if (resultsPagination) {
    resultsPagination.classList.toggle("hidden", !hasRows);
  }
}

function updateRunExportLinks(payload) {
  const runId = payload.run_id;
  const completedA = Number(payload.counts_a?.completed || 0);
  const completedB = Number(payload.counts_b?.completed || 0);
  const canExport = Boolean(runId) && (payload.status === "completed" || payload.status === "failed") && (completedA > 0 || completedB > 0);
  if (exportActions) {
    exportActions.classList.toggle("hidden", !runId);
  }
  setLinkState(exportALink, canExport ? payload.results_xlsx_url_a : "#", canExport);
  setLinkState(exportBLink, canExport ? payload.results_xlsx_url_b : "#", canExport);
  setLinkState(exportCombinedLink, canExport ? payload.results_xlsx_url_combined : "#", canExport);
  setLinkState(errorsRisALink, canExport && Number(payload.counts_a?.errors || 0) > 0 ? payload.errors_ris_url_a : "#", canExport && Number(payload.counts_a?.errors || 0) > 0);
  setLinkState(errorsRisBLink, canExport && Number(payload.counts_b?.errors || 0) > 0 ? payload.errors_ris_url_b : "#", canExport && Number(payload.counts_b?.errors || 0) > 0);
  if (exportToggleButton) {
    exportToggleButton.disabled = !canExport;
    if (!canExport) setExportMenuOpen(false);
  }

  const reviewExportReady = Boolean(runId) && (payload.status === "completed" || payload.status === "failed");
  setLinkState(reviewExportALink, reviewExportReady ? `/api/runs/${runId}/results/a.xlsx` : "#", reviewExportReady);
  setLinkState(reviewExportBLink, reviewExportReady ? `/api/runs/${runId}/results/b.xlsx` : "#", reviewExportReady);
  setLinkState(reviewExportCombinedLink, reviewExportReady ? `/api/runs/${runId}/results/combined.xlsx` : "#", reviewExportReady);
}

function setLinkState(link, href, enabled) {
  if (!link) {
    return;
  }
  link.href = href;
  link.setAttribute("aria-disabled", enabled ? "false" : "true");
}

function syncResumeButtons(payload = state.runStatus) {
  if (!payload) {
    return;
  }
  const showA = Boolean(payload.run_id) && (payload.status_a === "failed" || (Number(payload.counts_a?.pending || 0) > 0 && payload.status_a !== "running"));
  const showB = Boolean(payload.run_id) && (payload.status_b === "failed" || (Number(payload.counts_b?.pending || 0) > 0 && payload.status_b !== "running"));
  if (resumeAButton) {
    resumeAButton.classList.toggle("hidden", !showA);
    resumeAButton.disabled = payload.status === "running" && payload.status_a === "running";
    resumeAButton.textContent = `Resume Model A`;
  }
  if (resumeBButton) {
    resumeBButton.classList.toggle("hidden", !showB);
    resumeBButton.disabled = payload.status === "running" && payload.status_b === "running";
    resumeBButton.textContent = `Resume Model B`;
  }
}

function syncCreateReviewProjectButton(payload = state.runStatus) {
  if (!createReviewProjectButton) {
    return;
  }
  const completedA = Number(payload.counts_a?.completed || 0);
  const completedB = Number(payload.counts_b?.completed || 0);
  const canImport = Boolean(payload.run_id) && payload.status === "completed" && (completedA > 0 || completedB > 0);
  createReviewProjectButton.disabled = !canImport;
  createReviewProjectButton.textContent = "Import into review project";
}

async function createReviewProjectFromRun() {
  if (!state.latestRunId || !createReviewProjectButton || createReviewProjectButton.disabled) {
    return;
  }
  createReviewProjectButton.disabled = true;
  createReviewProjectButton.textContent = "Importing into review project...";
  try {
    const response = await fetch(`/api/runs/${state.latestRunId}/review-projects`, { method: "POST" });
    const payload = await parseJsonSafely(response);
    if (!response.ok) {
      window.alert(formatApiError(payload, "Failed to import these results into a review project."));
      return;
    }
    window.location.href = `/review-projects/${payload.project_id}`;
  } catch (error) {
    console.error(error);
    window.alert("Could not reach backend while importing these results into a review project.");
  } finally {
    syncCreateReviewProjectButton();
  }
}

function resetRunState(runId) {
  state.runAfterIndex = 0;
  state.runResultsBySequence = new Map();
  state.runResultsTotal = 0;
  state.runResultsPage = 1;
  state.runStatus = {
    run_id: runId,
    status: "prepared",
    status_a: "prepared",
    status_b: "prepared",
    counts_a: { total: 0, completed: 0, yes: 0, no: 0, maybe: 0, errors: 0, pending: 0 },
    counts_b: { total: 0, completed: 0, yes: 0, no: 0, maybe: 0, errors: 0, pending: 0 },
  };
  syncRunResultsVisibility();
  renderRunResultsPage();
}

function updateStatusPill(status, project = null) {
  if (!projectStatusPill) {
    return;
  }
  projectStatusPill.textContent = formatProjectStatus(status, project);
  projectStatusPill.className = `pill status-${status || "idle"}`;
}

function formatProjectStatus(status, project = null) {
  if (status === "completed") return "Done";
  if (status === "running") return "Running";
  if (status === "failed") return "Failed";
  if (status === "prepared") return "Ready";
  if (project) {
    const hasCriteria = Boolean((project.inclusion_criteria || []).length && (project.exclusion_criteria || []).length);
    const hasImport = Number(project.import_summary?.deduplicated_count || 0) > 0;
    if (hasImport) return "Ready to run";
    if (hasCriteria) return "Ready for import";
  }
  return "Not started";
}

function updateStepCards(project) {
  const hasCriteria = Boolean((project.inclusion_criteria || []).length && (project.exclusion_criteria || []).length);
  const hasImport = Number(project.import_summary?.deduplicated_count || 0) > 0;
  for (const card of document.querySelectorAll(".step-card")) {
    const slug = card.dataset.step;
    card.classList.remove("done");
    if (slug === "project") card.classList.add("done");
    if (slug === "criteria" && hasCriteria) card.classList.add("done");
    if (slug === "import" && hasImport) card.classList.add("done");
    if (slug === "run" && project.status === "completed") card.classList.add("done");
  }
}

function hydrateProject(project) {
  if (projectName) {
    projectName.textContent = project.name || "";
  }
  if (projectDescription) {
    projectDescription.textContent = project.description || "";
  }
  if (projectNameInput) {
    projectNameInput.value = project.name || "";
  }
  if (projectDescriptionInput) {
    projectDescriptionInput.value = project.description || "";
  }

  const modelA = project.model_a || state.modelA;
  const modelB = project.model_b || state.modelB;
  if (projectModelAInput) {
    projectModelAInput.value = modelA;
  }
  if (projectModelBInput) {
    projectModelBInput.value = modelB;
  }
  state.modelA = modelA;
  state.modelB = modelB;
  updateProjectModelDisplay();
  renderApiKeySettings();

  updateStatusPill(project.status, project);
  state.inclusionCriteria = project.inclusion_criteria || [];
  state.exclusionCriteria = project.exclusion_criteria || [];
  state.importSummary = project.import_summary || state.importSummary;
  updateImportSummary(state.importSummary);
  updateImportNextState();
  renderSelectedFiles();
  renderCriteria();
  updateStepCards(project);

  const previousRunId = state.latestRunId;
  state.latestRunId = project.latest_run_id || null;
  if (currentStep === "run") {
    if (state.latestRunId && previousRunId !== state.latestRunId) {
      resetRunState(state.latestRunId);
    }
    if (state.latestRunId) {
      startPolling();
    } else {
      syncResumeButtons();
      syncCreateReviewProjectButton();
      setRunBusy(false);
    }
  }

  if (currentStep === "review") {
    if (state.latestRunId) {
      loadReviewWorkspace();
    } else {
      resetReviewWorkspace();
    }
  }
}

async function loadReviewWorkspace() {
  if (!state.latestRunId) {
    resetReviewWorkspace();
    return;
  }
  setLinkState(reviewExportALink, `/api/runs/${state.latestRunId}/results/a.xlsx`, true);
  setLinkState(reviewExportBLink, `/api/runs/${state.latestRunId}/results/b.xlsx`, true);
  setLinkState(reviewExportCombinedLink, `/api/runs/${state.latestRunId}/results/combined.xlsx`, true);
  if (reviewSaveStatus) {
    reviewSaveStatus.textContent = "Loading review workspace...";
  }
  try {
    const response = await fetch(`/api/runs/${state.latestRunId}/review`);
    const payload = await parseJsonSafely(response);
    if (!response.ok) {
      resetReviewWorkspace();
      if (reviewSaveStatus) {
        reviewSaveStatus.textContent = formatApiError(payload, "Could not load review results.");
      }
      return;
    }
    state.reviewModelA = payload.model_a || "";
    state.reviewModelB = payload.model_b || "";
    state.reviewItems = payload.items || [];
    state.reviewConsensusDefaultFocus = true;
    ensureSelectedReviewItem();
    renderReviewWorkspace();
    if (reviewSaveStatus) {
      reviewSaveStatus.textContent = "";
    }
  } catch (error) {
    console.error(error);
    resetReviewWorkspace();
    if (reviewSaveStatus) {
      reviewSaveStatus.textContent = "Could not reach backend while loading review results.";
    }
  }
}

function resetReviewWorkspace() {
  state.reviewItems = [];
  state.reviewFilteredItems = [];
  state.selectedReviewItemId = null;
  state.reviewDraft = { judgment: null, reason: "" };
  renderReviewWorkspace();
}

function renderReviewWorkspace() {
  if (!reviewShell || !reviewEmpty) {
    return;
  }

  updateReviewSummary();
  syncReviewFilterOptionLabels();
  state.reviewFilteredItems = getFilteredReviewItems();

  const hasItems = state.reviewItems.length > 0;
  reviewEmpty.classList.toggle("hidden", hasItems);
  reviewShell.classList.toggle("hidden", !hasItems);
  if (!hasItems) {
    return;
  }

  if (!state.reviewFilteredItems.some((item) => item.item_id === state.selectedReviewItemId)) {
    state.selectedReviewItemId = state.reviewFilteredItems[0]?.item_id || null;
  }

  const selected = getSelectedReviewItem();
  if (selected) {
    state.reviewDraft = {
      judgment: selected.human_judgment || null,
      reason: selected.human_reason || "",
    };
  } else {
    state.reviewDraft = { judgment: null, reason: "" };
  }

  if (reviewVisibleCount) {
    const shown = state.reviewFilteredItems.length;
    reviewVisibleCount.textContent = shown === 1 ? "1 shown" : `${shown} shown`;
  }

  renderReviewList();
  renderReviewDetail();
}

function updateReviewSummary() {
  const items = state.reviewItems;
  const included = items.filter((item) => getReviewFinalStatus(item).status === "included").length;
  const needsReview = items.filter((item) => getReviewFinalStatus(item).status === "needs_review").length;
  const excluded = items.filter((item) => getReviewFinalStatus(item).status === "excluded").length;
  setStat("review-stat-total", items.length);
  setStat("review-stat-consensus-agree", included);
  setStat("review-stat-consensus-partial", needsReview);
  setStat("review-stat-consensus-conflict", excluded);
  setStat("review-stat-consensus-pending", 0);
  setStat("review-stat-reviewed", items.filter((item) => item.human_judgment).length);
  setStat("review-stat-human-yes", items.filter((item) => item.human_judgment === "yes").length);
  setStat("review-stat-human-no", items.filter((item) => item.human_judgment === "no").length);
  setStat("review-stat-human-maybe", items.filter((item) => item.human_judgment === "maybe").length);
}

function syncReviewFilterOptionLabels() {
  const items = state.reviewItems;
  const countsA = countJudgments(items, "judgment_a");
  const countsB = countJudgments(items, "judgment_b");
  const finalStatusCounts = {
    all: items.length,
    included: items.filter((item) => getReviewFinalStatus(item).status === "included").length,
    excluded: items.filter((item) => getReviewFinalStatus(item).status === "excluded").length,
    needs_review: items.filter((item) => getReviewFinalStatus(item).status === "needs_review").length,
  };
  const humanCounts = {
    all: items.length,
    unreviewed: items.filter((item) => !item.human_judgment).length,
    yes: items.filter((item) => item.human_judgment === "yes").length,
    no: items.filter((item) => item.human_judgment === "no").length,
    maybe: items.filter((item) => item.human_judgment === "maybe").length,
  };

  setSelectOptionLabel(reviewFilterA, "all", `All A decisions (${countsA.all})`);
  setSelectOptionLabel(reviewFilterA, "yes", `A include (${countsA.yes})`);
  setSelectOptionLabel(reviewFilterA, "no", `A exclude (${countsA.no})`);
  setSelectOptionLabel(reviewFilterA, "maybe", `A maybe (${countsA.maybe})`);
  setSelectOptionLabel(reviewFilterB, "all", `All B decisions (${countsB.all})`);
  setSelectOptionLabel(reviewFilterB, "yes", `B include (${countsB.yes})`);
  setSelectOptionLabel(reviewFilterB, "no", `B exclude (${countsB.no})`);
  setSelectOptionLabel(reviewFilterB, "maybe", `B maybe (${countsB.maybe})`);
  setSelectOptionLabel(reviewFilterConsensus, "all", `All final statuses (${finalStatusCounts.all})`);
  setSelectOptionLabel(reviewFilterConsensus, "included", `Included in RIS (${finalStatusCounts.included})`);
  setSelectOptionLabel(reviewFilterConsensus, "excluded", `Excluded (${finalStatusCounts.excluded})`);
  setSelectOptionLabel(reviewFilterConsensus, "needs_review", `Needs review (${finalStatusCounts.needs_review})`);
  setSelectOptionLabel(reviewFilterHuman, "all", `All human decisions (${humanCounts.all})`);
  setSelectOptionLabel(reviewFilterHuman, "unreviewed", `Unreviewed (${humanCounts.unreviewed})`);
  setSelectOptionLabel(reviewFilterHuman, "yes", `Human include (${humanCounts.yes})`);
  setSelectOptionLabel(reviewFilterHuman, "no", `Human exclude (${humanCounts.no})`);
  setSelectOptionLabel(reviewFilterHuman, "maybe", `Human maybe (${humanCounts.maybe})`);
}

function countJudgments(items, field) {
  return {
    all: items.length,
    yes: items.filter((item) => item[field] === "yes").length,
    no: items.filter((item) => item[field] === "no").length,
    maybe: items.filter((item) => item[field] === "maybe").length,
  };
}

function getFilteredReviewItems() {
  const filterA = reviewFilterA?.value || "all";
  const filterB = reviewFilterB?.value || "all";
  const filterFinalStatus = reviewFilterConsensus?.value || "all";
  const filterHuman = reviewFilterHuman?.value || "all";
  const query = (reviewSearch?.value || "").trim().toLowerCase();

  return state.reviewItems.filter((item) => {
    if (filterA !== "all" && item.judgment_a !== filterA) {
      return false;
    }
    if (filterB !== "all" && item.judgment_b !== filterB) {
      return false;
    }
    if (filterFinalStatus !== "all" && getReviewFinalStatus(item).status !== filterFinalStatus) {
      return false;
    }
    if (filterHuman === "unreviewed" && item.human_judgment) {
      return false;
    }
    if (filterHuman !== "all" && filterHuman !== "unreviewed" && item.human_judgment !== filterHuman) {
      return false;
    }
    if (!query) {
      return true;
    }
    return [item.title, item.journal, item.doi, item.abstract, item.import_filename]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });
}

function renderReviewList() {
  if (!reviewList) {
    return;
  }
  if (!state.reviewFilteredItems.length) {
    reviewList.innerHTML = `
      <article class="empty-card compact-empty">
        <h3>No matches</h3>
        <p>Adjust the filters to show matching papers.</p>
      </article>
    `;
    return;
  }
  reviewList.innerHTML = state.reviewFilteredItems
    .map(
      (item) => `
        <button
          type="button"
          class="review-list-item ${item.item_id === state.selectedReviewItemId ? "selected" : ""}"
          data-review-item-id="${escapeHtml(item.item_id)}"
        >
          <div class="review-list-item-top">
            <span class="review-seq">#${item.sequence}</span>
            <div class="review-list-pill-row">
              ${renderReviewFinalStatusPill(item)}
              <span class="pill source-pill">${escapeHtml(getReviewDecisionSourceLabel(item))}</span>
            </div>
          </div>
          <strong>${escapeHtml(item.title)}</strong>
        </button>
      `,
    )
    .join("");
}

function formatReviewBadge(item) {
  return `A: ${formatShortJudgment(item.judgment_a)} · B: ${formatShortJudgment(item.judgment_b)} · Human: ${formatShortJudgment(item.human_judgment)} · Final: ${getReviewFinalStatus(item).label}`;
}

function formatShortJudgment(value) {
  if (value === "yes") return "INCLUDE";
  if (value === "no") return "EXCLUDE";
  if (value === "maybe") return "MAYBE";
  return "—";
}

function renderReviewDetail() {
  if (!reviewDetailEmpty || !reviewDetailContent) {
    return;
  }
  const item = getSelectedReviewItem();
  const hasItem = Boolean(item);
  reviewDetailEmpty.classList.toggle("hidden", hasItem);
  reviewDetailContent.classList.toggle("hidden", !hasItem);
  if (!item) {
    return;
  }

  if (reviewSequence) {
    reviewSequence.textContent = `Paper ${item.sequence}`;
  }
  if (reviewTitle) {
    reviewTitle.textContent = item.title || "";
  }
  if (reviewModelAPill) {
    reviewModelAPill.className = getJudgmentPillClass(item.judgment_a);
    reviewModelAPill.textContent = `A: ${formatDecisionLabel(item.judgment_a)}`;
  }
  if (reviewModelBPill) {
    reviewModelBPill.className = getJudgmentPillClass(item.judgment_b);
    reviewModelBPill.textContent = `B: ${formatDecisionLabel(item.judgment_b)}`;
  }
  if (reviewConsensusPill) {
    const finalStatus = getReviewFinalStatus({ ...item, human_judgment: state.reviewDraft.judgment });
    reviewConsensusPill.className = `pill final-status-${finalStatus.status}`;
    reviewConsensusPill.textContent = finalStatus.label;
  }
  if (reviewHumanPill) {
    reviewHumanPill.className = getHumanReviewPillClass(state.reviewDraft.judgment);
    reviewHumanPill.textContent = formatHumanReviewLabel(state.reviewDraft.judgment);
  }
  if (reviewMeta) {
    reviewMeta.innerHTML = buildReviewMeta(item);
  }
  if (reviewAbstract) {
    reviewAbstract.textContent = item.abstract || "No abstract available.";
  }
  if (reviewSummaryBadge) {
    reviewSummaryBadge.textContent = formatReviewBadge(item);
  }
  if (reviewReasonA) {
    reviewReasonA.textContent = item.reason_a || "No reasoning available.";
  }
  if (reviewReasonB) {
    reviewReasonB.textContent = item.reason_b || "No reasoning available.";
  }
  if (reviewInclusionA) {
    reviewInclusionA.innerHTML = buildCriteriaSingleGroup(item.criterion_results_a, "inclusion");
  }
  if (reviewInclusionB) {
    reviewInclusionB.innerHTML = buildCriteriaSingleGroup(item.criterion_results_b, "inclusion");
  }
  if (reviewExclusionA) {
    reviewExclusionA.innerHTML = buildCriteriaSingleGroup(item.criterion_results_a, "exclusion");
  }
  if (reviewExclusionB) {
    reviewExclusionB.innerHTML = buildCriteriaSingleGroup(item.criterion_results_b, "exclusion");
  }
  syncReviewCriteriaToggles(item);
  if (reviewHumanReasonInput) {
    reviewHumanReasonInput.value = state.reviewDraft.reason || "";
  }
  syncReviewJudgmentButtons();
}

function buildReviewMeta(item) {
  const fields = [
    item.import_filename ? `<span class="meta-chip">Import: ${escapeHtml(item.import_filename)}</span>` : "",
    item.journal ? `<span class="meta-chip">${escapeHtml(item.journal)}</span>` : "",
    item.year ? `<span class="meta-chip">${escapeHtml(item.year)}</span>` : "",
    item.doi ? `<span class="meta-chip">DOI: ${escapeHtml(item.doi)}</span>` : "",
    ...(item.source_files || []).map((value) => `<span class="meta-chip">${escapeHtml(value)}</span>`),
  ].filter(Boolean);
  return fields.length ? fields.join("") : `<span class="meta-chip">No metadata available</span>`;
}

function buildCriteriaSingleGroup(criteriaResults, kind) {
  if (!criteriaResults) {
    return `<p class="muted">No criterion-level output available.</p>`;
  }
  const items = (kind === "exclusion" ? criteriaResults.exclusion : criteriaResults.inclusion) || [];
  return buildCriteriaResultList(items, kind === "exclusion" ? "Exclusion" : "Inclusion");
}

function buildCriteriaResultList(items, title) {
  if (!items.length) {
    return `<article class="criteria-result-card"><strong>${escapeHtml(title)}</strong><p class="muted">No items.</p></article>`;
  }
  return `
    <article class="criteria-result-card">
      <strong>${escapeHtml(title)}</strong>
      <div class="stack">
        ${items
          .map(
            (item) => `
              <div>
                <span class="pill subtle">${escapeHtml(item.id)}</span>
                <span class="judgment-chip judgment-${escapeHtml(item.judgment)}">${escapeHtml(item.judgment)}</span>
                <p>${escapeHtml(item.text)}</p>
                <p class="muted">${escapeHtml(item.reason)}</p>
              </div>
            `,
          )
          .join("")}
      </div>
    </article>
  `;
}

function getJudgmentPillClass(judgment) {
  return judgment ? `pill judgment-${judgment}` : "pill subtle";
}

function getReviewFinalStatus(item) {
  if (item.human_judgment === "yes") {
    return { status: "included", label: "Included in RIS" };
  }
  if (item.human_judgment === "no") {
    return { status: "excluded", label: "Excluded" };
  }
  if (item.human_judgment === "maybe") {
    return { status: "needs_review", label: "Needs review" };
  }
  if (item.judgment_a === "yes" && item.judgment_b === "yes") {
    return { status: "included", label: "Included in RIS" };
  }
  if (item.judgment_a === "no" && item.judgment_b === "no") {
    return { status: "excluded", label: "Excluded" };
  }
  return { status: "needs_review", label: "Needs review" };
}

function renderReviewFinalStatusPill(item) {
  const finalStatus = getReviewFinalStatus(item);
  return `<span class="pill final-status-${escapeHtml(finalStatus.status)}">${escapeHtml(finalStatus.label)}</span>`;
}

function getReviewDecisionSourceLabel(item) {
  if (item.human_judgment === "yes" || item.human_judgment === "no") {
    return "Human";
  }
  if (item.human_judgment === "maybe") {
    return "Human maybe";
  }
  if (
    (item.judgment_a === "yes" && item.judgment_b === "yes") ||
    (item.judgment_a === "no" && item.judgment_b === "no")
  ) {
    return "AI agreement";
  }
  return "Unreviewed";
}

function formatDecisionLabel(value) {
  if (value === "yes") return "Include";
  if (value === "no") return "Exclude";
  if (value === "maybe") return "Maybe";
  return "Pending";
}

function countCriterionItems(item) {
  if (!item) return { inclusion: 0, exclusion: 0 };
  const a = item.criterion_results_a || {};
  const b = item.criterion_results_b || {};
  return {
    inclusion: Math.max((a.inclusion || []).length, (b.inclusion || []).length),
    exclusion: Math.max((a.exclusion || []).length, (b.exclusion || []).length),
  };
}

function syncReviewCriteriaToggles(item) {
  const target = item || getSelectedReviewItem();
  const counts = countCriterionItems(target);
  if (reviewInclusionToggle && reviewInclusionSection && reviewInclusionToggleLabel) {
    const expanded = state.reviewInclusionExpanded;
    reviewInclusionSection.classList.toggle("hidden", !expanded);
    reviewInclusionToggle.setAttribute("aria-expanded", expanded ? "true" : "false");
    reviewInclusionToggleLabel.textContent = expanded
      ? `▾ Hide inclusion details (${counts.inclusion})`
      : `▸ Show inclusion details (${counts.inclusion})`;
  }
  if (reviewExclusionToggle && reviewExclusionSection && reviewExclusionToggleLabel) {
    const expanded = state.reviewExclusionExpanded;
    reviewExclusionSection.classList.toggle("hidden", !expanded);
    reviewExclusionToggle.setAttribute("aria-expanded", expanded ? "true" : "false");
    reviewExclusionToggleLabel.textContent = expanded
      ? `▾ Hide exclusion details (${counts.exclusion})`
      : `▸ Show exclusion details (${counts.exclusion})`;
  }
}

function syncReviewJudgmentButtons() {
  const entries = [
    [reviewHumanYesButton, "yes"],
    [reviewHumanMaybeButton, "maybe"],
    [reviewHumanNoButton, "no"],
  ];
  for (const [button, judgment] of entries) {
    if (button) {
      button.classList.toggle("is-active", state.reviewDraft.judgment === judgment);
    }
  }
}

function ensureSelectedReviewItem() {
  if (!state.reviewItems.length) {
    state.selectedReviewItemId = null;
    return;
  }
  if (!state.reviewItems.some((item) => item.item_id === state.selectedReviewItemId)) {
    state.selectedReviewItemId = state.reviewItems[0].item_id;
  }
}

function selectReviewItem(itemId) {
  const item = state.reviewItems.find((entry) => entry.item_id === itemId);
  if (!item) {
    return;
  }
  state.selectedReviewItemId = itemId;
  state.reviewDraft = {
    judgment: item.human_judgment || null,
    reason: item.human_reason || "",
  };
  renderReviewWorkspace();
}

function getSelectedReviewItem() {
  return state.reviewFilteredItems.find((item) => item.item_id === state.selectedReviewItemId) || null;
}

function setReviewDraftJudgment(judgment) {
  state.reviewDraft.judgment = judgment;
  renderReviewDetail();
}

function formatHumanReviewLabel(judgment) {
  if (judgment === "yes") return "Human: Include";
  if (judgment === "no") return "Human: Exclude";
  if (judgment === "maybe") return "Human: Maybe";
  return "Human: Unreviewed";
}

function getHumanReviewPillClass(judgment) {
  return `pill human-pill human-pill-${judgment || "unreviewed"}`;
}

async function saveReviewDecision() {
  const item = state.reviewItems.find((entry) => entry.item_id === state.selectedReviewItemId);
  if (!item || !state.latestRunId) {
    return;
  }

  if (reviewSaveButton) {
    reviewSaveButton.disabled = true;
  }
  if (reviewSaveStatus) {
    reviewSaveStatus.textContent = "Saving review...";
  }
  try {
    const response = await fetch(`/api/runs/${state.latestRunId}/review/${encodeURIComponent(item.source_id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        judgment: state.reviewDraft.judgment,
        reason: (state.reviewDraft.reason || "").trim(),
      }),
    });
    const payload = await parseJsonSafely(response);
    if (!response.ok) {
      if (reviewSaveStatus) {
        reviewSaveStatus.textContent = formatApiError(payload, "Failed to save review.");
      }
      return;
    }
    const index = state.reviewItems.findIndex((entry) => entry.item_id === payload.item_id);
    if (index >= 0) {
      state.reviewItems[index] = payload;
    }
    state.selectedReviewItemId = payload.item_id;
    state.reviewDraft = {
      judgment: payload.human_judgment || null,
      reason: payload.human_reason || "",
    };
    renderReviewWorkspace();
    if (reviewSaveStatus) {
      reviewSaveStatus.textContent = "Review saved.";
    }
  } catch (error) {
    console.error(error);
    if (reviewSaveStatus) {
      reviewSaveStatus.textContent = "Could not reach backend while saving review.";
    }
  } finally {
    if (reviewSaveButton) {
      reviewSaveButton.disabled = false;
    }
  }
}

async function adoptAgreeItems() {
  if (!state.latestRunId || !reviewAdoptAgreeButton) {
    return;
  }
  const candidates = state.reviewItems.filter((item) => item.consensus === "agree" && !item.human_judgment && item.source_id);
  if (!candidates.length) {
    if (reviewSaveStatus) {
      reviewSaveStatus.textContent = "No unreviewed Agree items to adopt.";
    }
    return;
  }

  reviewAdoptAgreeButton.disabled = true;
  reviewAdoptAgreeButton.textContent = "Applying...";
  if (reviewSaveStatus) {
    reviewSaveStatus.textContent = `Applying to ${candidates.length} items...`;
  }

  try {
    for (const item of candidates) {
      const judgment = item.judgment_a || item.judgment_b;
      if (!judgment) {
        continue;
      }
      const response = await fetch(`/api/runs/${state.latestRunId}/review/${encodeURIComponent(item.source_id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          judgment,
          reason: "Adopted from model consensus (agree).",
        }),
      });
      const payload = await parseJsonSafely(response);
      if (response.ok) {
        const index = state.reviewItems.findIndex((entry) => entry.item_id === payload.item_id);
        if (index >= 0) {
          state.reviewItems[index] = payload;
        }
      }
    }
    renderReviewWorkspace();
    if (reviewSaveStatus) {
      reviewSaveStatus.textContent = "Agree items adopted.";
    }
  } catch (error) {
    console.error(error);
    if (reviewSaveStatus) {
      reviewSaveStatus.textContent = "Failed to adopt Agree items.";
    }
  } finally {
    reviewAdoptAgreeButton.disabled = false;
    reviewAdoptAgreeButton.textContent = "Adopt all Agree";
  }
}

function setSelectOptionLabel(select, value, label) {
  const option = select?.querySelector(`option[value="${value}"]`);
  if (option) {
    option.textContent = label;
  }
}

function setStat(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = String(value);
  }
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatApiError(payload, fallback) {
  if (!payload || !payload.detail) {
    return fallback;
  }
  if (typeof payload.detail === "string") {
    return payload.detail;
  }
  if (Array.isArray(payload.detail)) {
    const messages = payload.detail
      .map((item) => {
        if (!item || typeof item !== "object") {
          return null;
        }
        const location = Array.isArray(item.loc) ? item.loc.join(".") : "request";
        const message = item.msg || "Invalid value";
        return `${location}: ${message}`;
      })
      .filter(Boolean);
    return messages.length ? messages.join("\n") : fallback;
  }
  return fallback;
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

function showConfirm(message, options = {}) {
  const {
    title = "Are you sure?",
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    danger = false,
    eyebrow = "Confirm",
    subject = "",
  } = options;
  return new Promise((resolve) => {
    const modal = getConfirmModal();
    const titleEl = modal.querySelector("[data-confirm-title]");
    const eyebrowEl = modal.querySelector("[data-confirm-eyebrow]");
    const messageEl = modal.querySelector("[data-confirm-message]");
    const subjectEl = modal.querySelector("[data-confirm-subject]");
    const confirmBtn = modal.querySelector("[data-confirm-ok]");
    const cancelBtn = modal.querySelector("[data-confirm-cancel]");
    if (titleEl) titleEl.textContent = title;
    if (eyebrowEl) eyebrowEl.textContent = eyebrow;
    if (messageEl) messageEl.textContent = String(message || "");
    if (subjectEl) {
      subjectEl.textContent = String(subject || "");
      subjectEl.classList.toggle("hidden", !subject);
    }
    if (confirmBtn) {
      confirmBtn.textContent = confirmLabel;
      confirmBtn.classList.toggle("danger-solid-button", !!danger);
    }
    if (cancelBtn) cancelBtn.textContent = cancelLabel;

    const close = (result) => {
      modal.classList.add("hidden");
      modal.setAttribute("aria-hidden", "true");
      modal.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
      resolve(result);
    };
    const onClick = (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.matches("[data-confirm-ok]")) close(true);
      else if (target.matches("[data-confirm-cancel]")) close(false);
    };
    const onKey = (event) => {
      if (event.key === "Escape") close(false);
      else if (event.key === "Enter") close(true);
    };
    modal.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    if (confirmBtn instanceof HTMLButtonElement) confirmBtn.focus();
  });
}

function getConfirmModal() {
  let modal = document.getElementById("confirm-modal");
  if (modal) return modal;
  modal = document.createElement("div");
  modal.id = "confirm-modal";
  modal.className = "modal-shell hidden";
  modal.setAttribute("aria-hidden", "true");
  modal.innerHTML = `
    <div class="modal-backdrop" data-confirm-cancel></div>
    <section class="modal-card modal-card-sm" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div class="stack">
        <div>
          <p class="eyebrow" data-confirm-eyebrow>Confirm</p>
          <h2 id="confirm-title" data-confirm-title>Are you sure?</h2>
          <p class="confirm-subject hidden" data-confirm-subject></p>
          <p class="muted" data-confirm-message></p>
        </div>
        <div class="actions modal-actions">
          <button type="button" class="secondary" data-confirm-cancel>Cancel</button>
          <button type="button" data-confirm-ok>Confirm</button>
        </div>
      </div>
    </section>
  `;
  document.body.append(modal);
  return modal;
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

async function loadProject() {
  const response = await fetch(`/api/projects/${projectId}`);
  const payload = await parseJsonSafely(response);
  if (!response.ok) {
    window.alert(payload.detail || "Failed to load project.");
    return;
  }
  hydrateProject(payload);
}

loadProject();
loadApiKeyStatuses();
