const pageRoot = document.querySelector("[data-review-project-id]");
const reviewProjectId = pageRoot?.dataset.reviewProjectId || "";

const reviewProjectNameForm = document.getElementById("review-project-name-form");
const reviewProjectNameInput = document.getElementById("review-project-name-input");
const reviewProjectNameStatus = document.getElementById("review-project-name-status");
const reviewProjectSource = document.getElementById("review-project-source");
const reviewAddFilesButton = document.getElementById("review-add-files-button");
const reviewImportFilesInput = document.getElementById("review-import-files");
const reviewExportActions = document.getElementById("review-export-actions");
const reviewExportToggleButton = document.getElementById("review-export-toggle-button");
const reviewExportMenu = document.getElementById("review-export-menu");
const reviewExportCsvLink = document.getElementById("review-export-csv-link");
const reviewExportXlsxLink = document.getElementById("review-export-xlsx-link");
const reviewExportIncludedRisLink = document.getElementById("review-export-included-ris-link");

const reviewFilterA = document.getElementById("review-filter-a");
const reviewFilterB = document.getElementById("review-filter-b");
const reviewFilterConsensus = document.getElementById("review-filter-consensus");
const reviewFilterHuman = document.getElementById("review-filter-human");
const reviewSearch = document.getElementById("review-search");
const reviewAdoptAgreeButton = document.getElementById("review-adopt-agree-button");
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
  projectName: "",
  items: [],
  filteredItems: [],
  selectedItemId: null,
  draft: { judgment: null, reason: "" },
  consensusDefaultFocus: true,
  inclusionExpanded: false,
  exclusionExpanded: false,
};

if (reviewInclusionToggle) {
  reviewInclusionToggle.addEventListener("click", () => {
    state.inclusionExpanded = !state.inclusionExpanded;
    syncReviewCriteriaToggles();
  });
}
if (reviewExclusionToggle) {
  reviewExclusionToggle.addEventListener("click", () => {
    state.exclusionExpanded = !state.exclusionExpanded;
    syncReviewCriteriaToggles();
  });
}

if (reviewProjectNameForm) {
  reviewProjectNameForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await saveReviewProjectName();
  });
}

if (reviewProjectNameInput) {
  reviewProjectNameInput.addEventListener("blur", async () => {
    await saveReviewProjectName();
  });
  reviewProjectNameInput.addEventListener("keydown", async (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      await saveReviewProjectName();
      return;
    }
    if (event.key === "Escape") {
      reviewProjectNameInput.value = state.projectName;
      setReviewProjectNameStatus("");
      reviewProjectNameInput.blur();
    }
  });
}

if (reviewFilterA) {
  reviewFilterA.addEventListener("change", () => {
    state.consensusDefaultFocus = false;
    renderWorkspace();
  });
}

if (reviewFilterB) {
  reviewFilterB.addEventListener("change", () => {
    state.consensusDefaultFocus = false;
    renderWorkspace();
  });
}

if (reviewFilterConsensus) {
  reviewFilterConsensus.addEventListener("change", () => {
    state.consensusDefaultFocus = false;
    renderWorkspace();
  });
}

if (reviewFilterHuman) {
  reviewFilterHuman.addEventListener("change", () => {
    state.consensusDefaultFocus = false;
    renderWorkspace();
  });
}

if (reviewSearch) {
  reviewSearch.addEventListener("input", () => {
    state.consensusDefaultFocus = false;
    renderWorkspace();
  });
}

if (reviewAddFilesButton) {
  reviewAddFilesButton.addEventListener("click", () => {
    reviewImportFilesInput?.click();
  });
}

if (reviewImportFilesInput) {
  reviewImportFilesInput.addEventListener("change", async () => {
    await appendReviewFiles();
  });
}

if (reviewExportToggleButton) {
  reviewExportToggleButton.addEventListener("click", () => {
    toggleReviewExportMenu(reviewExportMenu?.classList.contains("hidden"));
  });
}

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Node) || !reviewExportActions?.contains(target)) {
    toggleReviewExportMenu(false);
  }
});

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
    selectItem(button.dataset.reviewItemId || "");
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
  if (!state.filteredItems.length) {
    return;
  }
  const idx = state.filteredItems.findIndex((item) => item.item_id === state.selectedItemId);
  let nextIdx;
  if (idx < 0) {
    nextIdx = 0;
  } else if (event.key === "ArrowDown") {
    nextIdx = Math.min(state.filteredItems.length - 1, idx + 1);
  } else {
    nextIdx = Math.max(0, idx - 1);
  }
  if (nextIdx === idx) {
    return;
  }
  event.preventDefault();
  selectItem(state.filteredItems[nextIdx].item_id);
  scrollSelectedListItemIntoView();
});

function scrollSelectedListItemIntoView() {
  if (!reviewList) return;
  const el = reviewList.querySelector(`[data-review-item-id="${state.selectedItemId}"]`);
  if (el && typeof el.scrollIntoView === "function") {
    el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
}

if (reviewHumanYesButton) {
  reviewHumanYesButton.addEventListener("click", () => setDraftJudgment("yes"));
}

if (reviewHumanMaybeButton) {
  reviewHumanMaybeButton.addEventListener("click", () => setDraftJudgment("maybe"));
}

if (reviewHumanNoButton) {
  reviewHumanNoButton.addEventListener("click", () => setDraftJudgment("no"));
}

if (reviewHumanReasonInput) {
  reviewHumanReasonInput.addEventListener("input", () => {
    state.draft.reason = reviewHumanReasonInput.value;
  });
}

if (reviewSaveButton) {
  reviewSaveButton.addEventListener("click", saveReviewDecision);
}

if (reviewAdoptAgreeButton) {
  reviewAdoptAgreeButton.addEventListener("click", adoptAgreeItems);
}

async function loadReviewProject() {
  if (!reviewProjectId) {
    if (reviewSaveStatus) {
      reviewSaveStatus.textContent = "Review project not found.";
    }
    return;
  }
  if (reviewSaveStatus) {
    reviewSaveStatus.textContent = "Loading review project...";
  }

  try {
    const response = await fetch(`/api/review-projects/${reviewProjectId}`);
    const payload = await parseJsonSafely(response);
    if (!response.ok) {
      if (reviewSaveStatus) {
        reviewSaveStatus.textContent = formatApiError(payload, "Failed to load review project.");
      }
      return;
    }
    applyReviewProjectMeta(payload);
    state.items = payload.items || [];
    state.consensusDefaultFocus = true;
    ensureSelection();
    renderWorkspace();
    if (reviewSaveStatus) {
      reviewSaveStatus.textContent = "";
    }
  } catch (error) {
    console.error(error);
    if (reviewSaveStatus) {
      reviewSaveStatus.textContent = "Could not reach backend while loading the review project.";
    }
  }
}

function applyReviewProjectMeta(payload) {
  state.projectName = payload.name || "Review project";
  if (reviewProjectNameInput) {
    reviewProjectNameInput.value = state.projectName;
  }
  if (reviewProjectSource) {
    const sourceCount = Array.isArray(payload.source_filenames) && payload.source_filenames.length
      ? payload.source_filenames.length
      : (payload.source_filename ? 1 : 0);
    reviewProjectSource.textContent = payload.source_filename
      ? `${sourceCount} source ${sourceCount === 1 ? "file" : "files"} imported`
      : "No source files imported yet.";
    reviewProjectSource.title = payload.source_filename || "";
  }
  if (reviewExportCsvLink) {
    reviewExportCsvLink.href = `/api/review-projects/${reviewProjectId}/results.csv`;
  }
  if (reviewExportXlsxLink) {
    reviewExportXlsxLink.href = `/api/review-projects/${reviewProjectId}/results.xlsx`;
  }
  if (reviewExportIncludedRisLink) {
    reviewExportIncludedRisLink.href = `/api/review-projects/${reviewProjectId}/included.ris`;
  }
}

function renderWorkspace() {
  syncFilterOptionLabels();
  state.filteredItems = getFilteredItems();

  const hasItems = state.items.length > 0;
  reviewEmpty?.classList.toggle("hidden", hasItems);
  reviewShell?.classList.toggle("hidden", !hasItems);
  if (!hasItems) {
    return;
  }

  if (!state.filteredItems.some((item) => item.item_id === state.selectedItemId)) {
    state.selectedItemId = state.filteredItems[0]?.item_id || null;
  }

  const selected = getSelectedItem();
  state.draft = selected
    ? { judgment: selected.human_judgment || null, reason: selected.human_reason || "" }
    : { judgment: null, reason: "" };

  renderList();
  renderDetail();
}

function getFilteredItems() {
  const filterA = reviewFilterA?.value || "all";
  const filterB = reviewFilterB?.value || "all";
  const filterFinalStatus = reviewFilterConsensus?.value || "all";
  const filterHuman = reviewFilterHuman?.value || "all";
  const query = (reviewSearch?.value || "").trim().toLowerCase();

  return state.items.filter((item) => {
    if (filterA !== "all" && item.judgment_a !== filterA) {
      return false;
    }
    if (filterB !== "all" && item.judgment_b !== filterB) {
      return false;
    }
    if (filterFinalStatus !== "all" && getFinalStatus(item).status !== filterFinalStatus) {
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

function renderList() {
  if (!reviewList) {
    return;
  }

  if (reviewVisibleCount) {
    reviewVisibleCount.textContent = state.filteredItems.length === 1 ? "1 shown" : `${state.filteredItems.length} shown`;
  }

  if (!state.filteredItems.length) {
    reviewList.innerHTML = `
      <article class="empty-card compact-empty">
        <h3>No matches</h3>
        <p>Adjust the filters to show matching papers.</p>
      </article>
    `;
    return;
  }

  reviewList.innerHTML = state.filteredItems
    .map(
      (item) => `
        <button
          type="button"
          class="review-list-item ${item.item_id === state.selectedItemId ? "selected" : ""}"
          data-review-item-id="${escapeHtml(item.item_id)}"
        >
          <div class="review-list-item-top">
            <span class="review-seq">#${item.sequence}</span>
            <div class="review-list-pill-row">
              ${renderFinalStatusPill(item)}
              <span class="pill source-pill">${escapeHtml(getDecisionSourceLabel(item))}</span>
            </div>
          </div>
          <strong>${escapeHtml(item.title)}</strong>
        </button>
      `,
    )
    .join("");
}

function formatCompactBadge(item) {
  return `A: ${formatShortJudgment(item.judgment_a)} · B: ${formatShortJudgment(item.judgment_b)} · Human: ${formatShortJudgment(item.human_judgment)} · Final: ${getFinalStatus(item).label}`;
}

function formatShortJudgment(value) {
  if (value === "yes") return "INCLUDE";
  if (value === "no") return "EXCLUDE";
  if (value === "maybe") return "MAYBE";
  return "—";
}

function renderDetail() {
  const item = getSelectedItem();
  const hasItem = Boolean(item);
  reviewDetailEmpty?.classList.toggle("hidden", hasItem);
  reviewDetailContent?.classList.toggle("hidden", !hasItem);
  if (!item) {
    return;
  }

  if (reviewSequence) {
    reviewSequence.textContent = `Paper ${item.sequence}`;
  }
  if (reviewTitle) {
    reviewTitle.textContent = item.title;
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
    const finalStatus = getFinalStatus({ ...item, human_judgment: state.draft.judgment });
    reviewConsensusPill.className = `pill final-status-${finalStatus.status}`;
    reviewConsensusPill.textContent = finalStatus.label;
  }
  if (reviewHumanPill) {
    reviewHumanPill.className = getHumanPillClass(state.draft.judgment);
    reviewHumanPill.textContent = formatHumanLabel(state.draft.judgment);
  }
  if (reviewMeta) {
    reviewMeta.innerHTML = buildMeta(item);
  }
  if (reviewAbstract) {
    reviewAbstract.textContent = item.abstract || "No abstract available.";
  }
  if (reviewSummaryBadge) {
    reviewSummaryBadge.textContent = formatCompactBadge(item);
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
    reviewHumanReasonInput.value = state.draft.reason || "";
  }
  syncJudgmentButtons();
}

function getJudgmentPillClass(judgment) {
  return judgment ? `pill judgment-${judgment}` : "pill subtle";
}

function getFinalStatus(item) {
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

function renderFinalStatusPill(item) {
  const finalStatus = getFinalStatus(item);
  return `<span class="pill final-status-${escapeHtml(finalStatus.status)}">${escapeHtml(finalStatus.label)}</span>`;
}

function getDecisionSourceLabel(item) {
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
            (entry) => `
              <div>
                <span class="pill subtle">${escapeHtml(entry.id)}</span>
                <span class="judgment-chip judgment-${escapeHtml(entry.judgment)}">${escapeHtml(entry.judgment)}</span>
                <p>${escapeHtml(entry.text)}</p>
                <p class="muted">${escapeHtml(entry.reason)}</p>
              </div>
            `,
          )
          .join("")}
      </div>
    </article>
  `;
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
  const target = item || getSelectedItem();
  const counts = countCriterionItems(target);
  if (reviewInclusionToggle && reviewInclusionSection && reviewInclusionToggleLabel) {
    const expanded = state.inclusionExpanded;
    reviewInclusionSection.classList.toggle("hidden", !expanded);
    reviewInclusionToggle.setAttribute("aria-expanded", expanded ? "true" : "false");
    reviewInclusionToggleLabel.textContent = expanded
      ? `▾ Hide inclusion details (${counts.inclusion})`
      : `▸ Show inclusion details (${counts.inclusion})`;
  }
  if (reviewExclusionToggle && reviewExclusionSection && reviewExclusionToggleLabel) {
    const expanded = state.exclusionExpanded;
    reviewExclusionSection.classList.toggle("hidden", !expanded);
    reviewExclusionToggle.setAttribute("aria-expanded", expanded ? "true" : "false");
    reviewExclusionToggleLabel.textContent = expanded
      ? `▾ Hide exclusion details (${counts.exclusion})`
      : `▸ Show exclusion details (${counts.exclusion})`;
  }
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

function buildMeta(item) {
  const fields = [
    item.import_filename ? `<span class="meta-chip">Import: ${escapeHtml(item.import_filename)}</span>` : "",
    item.journal ? `<span class="meta-chip">${escapeHtml(item.journal)}</span>` : "",
    item.year ? `<span class="meta-chip">${escapeHtml(item.year)}</span>` : "",
    item.doi ? `<span class="meta-chip">DOI: ${escapeHtml(item.doi)}</span>` : "",
    ...(item.source_files || []).map((value) => `<span class="meta-chip">${escapeHtml(value)}</span>`),
  ].filter(Boolean);
  return fields.length ? fields.join("") : `<span class="meta-chip">No metadata available</span>`;
}

function syncJudgmentButtons() {
  const entries = [
    [reviewHumanYesButton, "yes"],
    [reviewHumanMaybeButton, "maybe"],
    [reviewHumanNoButton, "no"],
  ];
  for (const [button, judgment] of entries) {
    if (button) {
      button.classList.toggle("is-active", state.draft.judgment === judgment);
    }
  }
}

function ensureSelection() {
  if (!state.items.length) {
    state.selectedItemId = null;
    return;
  }
  if (!state.items.some((item) => item.item_id === state.selectedItemId)) {
    state.selectedItemId = state.items[0].item_id;
  }
}

function selectItem(itemId) {
  const item = state.items.find((entry) => entry.item_id === itemId);
  if (!item) {
    return;
  }
  state.selectedItemId = itemId;
  state.draft = { judgment: item.human_judgment || null, reason: item.human_reason || "" };
  renderWorkspace();
}

function getSelectedItem() {
  return state.filteredItems.find((item) => item.item_id === state.selectedItemId) || null;
}

function setDraftJudgment(judgment) {
  state.draft.judgment = judgment;
  renderDetail();
}

function formatHumanLabel(judgment) {
  if (judgment === "yes") return "Human: Include";
  if (judgment === "no") return "Human: Exclude";
  if (judgment === "maybe") return "Human: Maybe";
  return "Human: Unreviewed";
}

function getHumanPillClass(judgment) {
  return `pill human-pill human-pill-${judgment || "unreviewed"}`;
}

function syncFilterOptionLabels() {
  const items = state.items;
  const countsA = countJudgments(items, "judgment_a");
  const countsB = countJudgments(items, "judgment_b");
  const finalStatusCounts = {
    all: items.length,
    included: items.filter((item) => getFinalStatus(item).status === "included").length,
    excluded: items.filter((item) => getFinalStatus(item).status === "excluded").length,
    needs_review: items.filter((item) => getFinalStatus(item).status === "needs_review").length,
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

function setSelectOptionLabel(select, value, label) {
  const option = select?.querySelector(`option[value="${value}"]`);
  if (option) {
    option.textContent = label;
  }
}

function setReviewProjectNameStatus(message) {
  if (reviewProjectNameStatus) {
    reviewProjectNameStatus.textContent = message;
  }
}

function toggleReviewExportMenu(forceOpen) {
  const isOpen = Boolean(forceOpen);
  reviewExportMenu?.classList.toggle("hidden", !isOpen);
  reviewExportToggleButton?.setAttribute("aria-expanded", isOpen ? "true" : "false");
}

async function saveReviewProjectName() {
  if (!reviewProjectId || !(reviewProjectNameInput instanceof HTMLInputElement)) {
    return false;
  }
  const nextName = reviewProjectNameInput.value.trim();
  if (!nextName) {
    reviewProjectNameInput.value = state.projectName;
    setReviewProjectNameStatus("Project name cannot be blank.");
    return false;
  }
  if (nextName === state.projectName) {
    setReviewProjectNameStatus("");
    return true;
  }

  reviewProjectNameInput.disabled = true;
  setReviewProjectNameStatus("Saving project name...");

  try {
    const response = await fetch(`/api/review-projects/${reviewProjectId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nextName }),
    });
    const payload = await parseJsonSafely(response);
    if (!response.ok) {
      setReviewProjectNameStatus(formatApiError(payload, "Failed to save project name."));
      reviewProjectNameInput.value = state.projectName;
      return false;
    }
    applyReviewProjectMeta(payload);
    setReviewProjectNameStatus("Project name saved.");
    return true;
  } catch (error) {
    console.error(error);
    reviewProjectNameInput.value = state.projectName;
    setReviewProjectNameStatus("Could not reach backend while saving project name.");
    return false;
  } finally {
    reviewProjectNameInput.disabled = false;
  }
}

async function saveReviewDecision() {
  const item = state.items.find((entry) => entry.item_id === state.selectedItemId);
  if (!item || !reviewProjectId) {
    return;
  }

  if (reviewSaveButton) {
    reviewSaveButton.disabled = true;
  }
  if (reviewSaveStatus) {
    reviewSaveStatus.textContent = "Saving review...";
  }

  try {
    const response = await fetch(`/api/review-projects/${reviewProjectId}/items/${encodeURIComponent(item.item_id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        judgment: state.draft.judgment,
        reason: (state.draft.reason || "").trim(),
      }),
    });
    const payload = await parseJsonSafely(response);
    if (!response.ok) {
      if (reviewSaveStatus) {
        reviewSaveStatus.textContent = formatApiError(payload, "Failed to save review.");
      }
      return;
    }
    const index = state.items.findIndex((entry) => entry.item_id === payload.item_id);
    if (index >= 0) {
      state.items[index] = payload;
    }
    state.draft = { judgment: payload.human_judgment || null, reason: payload.human_reason || "" };
    renderWorkspace();
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
  if (!reviewProjectId || !reviewAdoptAgreeButton) {
    return;
  }
  const candidates = state.items.filter((item) => item.consensus === "agree" && !item.human_judgment && item.item_id);
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
      const response = await fetch(`/api/review-projects/${reviewProjectId}/items/${encodeURIComponent(item.item_id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          judgment,
          reason: "Adopted from model consensus (agree).",
        }),
      });
      const payload = await parseJsonSafely(response);
      if (response.ok) {
        const index = state.items.findIndex((entry) => entry.item_id === payload.item_id);
        if (index >= 0) {
          state.items[index] = payload;
        }
      }
    }
    renderWorkspace();
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

async function appendReviewFiles() {
  const files = Array.from(reviewImportFilesInput?.files || []);
  if (!files.length || !reviewProjectId) {
    return;
  }
  if (reviewAddFilesButton) {
    reviewAddFilesButton.disabled = true;
    reviewAddFilesButton.textContent = "Uploading...";
  }
  if (reviewSaveStatus) {
    reviewSaveStatus.textContent = "Importing additional results or RIS files...";
  }

  const payload = new FormData();
  for (const file of files) {
    payload.append("files", file);
  }

  try {
    const response = await fetch(`/api/review-projects/${reviewProjectId}/imports`, {
      method: "POST",
      body: payload,
    });
    const body = await parseJsonSafely(response);
    if (!response.ok) {
      if (reviewSaveStatus) {
        reviewSaveStatus.textContent = formatApiError(body, "Failed to import additional results or RIS files.");
      }
      return;
    }

    applyReviewProjectMeta(body);
    state.items = body.items || [];
    state.consensusDefaultFocus = true;
    ensureSelection();
    renderWorkspace();
    if (reviewSaveStatus) {
      reviewSaveStatus.textContent = "Additional files imported.";
    }
  } catch (error) {
    console.error(error);
    if (reviewSaveStatus) {
      reviewSaveStatus.textContent = "Could not reach backend while importing additional results.";
    }
  } finally {
    if (reviewImportFilesInput) {
      reviewImportFilesInput.value = "";
    }
    if (reviewAddFilesButton) {
      reviewAddFilesButton.disabled = false;
      reviewAddFilesButton.textContent = "Upload CSV/XLSX or RIS";
    }
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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

function formatApiError(payload, fallback) {
  if (!payload || !payload.detail) {
    return fallback;
  }
  if (typeof payload.detail === "string") {
    return payload.detail;
  }
  return fallback;
}

loadReviewProject();
