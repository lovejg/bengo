const STORAGE_KEY = "bengo-test-ui";

const state = {
  baseUrl: "http://localhost:4000",
  token: "",
  selectedPolicyId: null,
};

function el(id) { return document.getElementById(id); }

const els = {
  baseUrl: el("baseUrl"),
  saveBaseUrlBtn: el("saveBaseUrlBtn"),
  authStatus: el("authStatus"),
  authStatusText: el("authStatusText"),
  signupEmail: el("signupEmail"),
  signupPassword: el("signupPassword"),
  signupAge: el("signupAge"),
  signupGender: el("signupGender"),
  signupRegion: el("signupRegion"),
  signupBtn: el("signupBtn"),
  loginEmail: el("loginEmail"),
  loginPassword: el("loginPassword"),
  loginBtn: el("loginBtn"),
  clearTokenBtn: el("clearTokenBtn"),
  sourcesBtn: el("sourcesBtn"),
  qualityReportBtn: el("qualityReportBtn"),
  pruneMvpBtn: el("pruneMvpBtn"),
  enrichBtn: el("enrichBtn"),
  collectMvpBtn: el("collectMvpBtn"),
  singleSource: el("singleSource"),
  collectOneBtn: el("collectOneBtn"),
  collectProgress: el("collectProgress"),
  collectProgressText: el("collectProgressText"),
  search: el("search"),
  interest: el("interest"),
  regionCode: el("regionCode"),
  sortBy: el("sortBy"),
  order: el("order"),
  onlyAvailable: el("onlyAvailable"),
  listPoliciesBtn: el("listPoliciesBtn"),
  policyList: el("policyList"),
  policyListCount: el("policyListCount"),
  policyId: el("policyId"),
  selectedPolicyInfo: el("selectedPolicyInfo"),
  selectedPolicyTitle: el("selectedPolicyTitle"),
  policyDetailBtn: el("policyDetailBtn"),
  answersJson: el("answersJson"),
  checkEligibilityBtn: el("checkEligibilityBtn"),
  policyState: el("policyState"),
  policyNote: el("policyNote"),
  updateStateBtn: el("updateStateBtn"),
  myPoliciesBtn: el("myPoliciesBtn"),
  responseLog: el("responseLog"),
  copyLogBtn: el("copyLogBtn"),
  clearLogBtn: el("clearLogBtn"),
};

// ── 저장/복원 ──
function loadStorage() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    if (parsed.baseUrl) state.baseUrl = parsed.baseUrl;
    if (parsed.token) state.token = parsed.token;
  } catch {}
}

function saveStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ baseUrl: state.baseUrl, token: state.token }));
}

// ── 토큰 / 인증 상태 ──
function setToken(token, email) {
  state.token = token || "";
  saveStorage();
  updateAuthStatus(email);
}

function updateAuthStatus(email) {
  const dot = els.authStatus.querySelector(".status-dot");
  if (state.token) {
    dot.className = "status-dot online";
    els.authStatusText.textContent = email ? `${email} 로그인됨` : "로그인됨";
  } else {
    dot.className = "status-dot offline";
    els.authStatusText.textContent = "로그인 필요";
  }
}

// ── 로그 ──
function logResponse(title, status, data) {
  const ts = new Date().toLocaleTimeString("ko-KR");
  const isError = status === 0 || status >= 400;
  const payload = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  els.responseLog.textContent = `[${ts}] ${title}  (HTTP ${status})\n${"─".repeat(50)}\n${payload}`;
  els.responseLog.className = isError ? "has-error" : "";
  els.responseLog.scrollTop = 0;
}

function logText(text) {
  els.responseLog.textContent = text;
  els.responseLog.className = "";
}

// ── API 요청 ──
function buildUrl(path, query = {}) {
  const url = new URL(path, state.baseUrl);
  Object.entries(query).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    url.searchParams.set(k, String(v));
  });
  return url.toString();
}

async function apiRequest({ method, path, body, auth = false, query } = {}) {
  const url = buildUrl(path, query);
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth && state.token) headers["Authorization"] = `Bearer ${state.token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let parsed;
  const text = await res.text();
  try { parsed = text ? JSON.parse(text) : {}; } catch { parsed = text; }

  if (!res.ok) {
    logResponse(`${method} ${path}`, res.status, parsed);
    throw new Error(`요청 실패 (${res.status})`);
  }

  logResponse(`${method} ${path}`, res.status, parsed);
  return parsed;
}

// ── 로딩 상태 ──
function setCollectLoading(loading, text = "수집 중...") {
  els.collectProgress.style.display = loading ? "flex" : "none";
  els.collectProgressText.textContent = text;
  els.collectMvpBtn.disabled = loading;
  els.collectOneBtn.disabled = loading;
}

// ── 정책 목록 렌더링 ──
function renderPolicies(items, total) {
  els.policyListCount.textContent = total ?? items.length;
  if (!items || items.length === 0) {
    els.policyList.innerHTML = '<div class="policy-item"><div class="policy-title">정책이 없습니다.</div><div class="meta">수집을 먼저 실행하거나 필터를 조정해 보세요.</div></div>';
    return;
  }

  els.policyList.innerHTML = "";
  items.forEach((policy) => {
    const div = document.createElement("div");
    div.className = "policy-item" + (policy.id === state.selectedPolicyId ? " selected" : "");
    const regions = (policy.regionCodes || []).map(r => `<span class="region-tag">${r.replace('seoul_','')}</span>`).join(" ");
    div.innerHTML = `
      <div class="policy-title">${escapeHtml(policy.title)}</div>
      <div class="meta">
        ${regions}
        <span>${escapeHtml(policy.providerName || "")}</span>
        ${policy.minAge || policy.maxAge ? `<span>만 ${policy.minAge ?? "?"}~${policy.maxAge ?? "?"}세</span>` : ""}
        <span class="state-tag ${policy.userState}">${stateLabel(policy.userState)}</span>
        ${policy.fitScore !== undefined ? `<span>적합도 ${policy.fitScore}</span>` : ""}
      </div>
    `;
    div.addEventListener("click", () => selectPolicy(policy));
    els.policyList.appendChild(div);
  });
}

function selectPolicy(policy) {
  state.selectedPolicyId = policy.id;
  els.policyId.value = policy.id;
  els.selectedPolicyInfo.style.display = "block";
  els.selectedPolicyTitle.textContent = policy.title;
  // 선택 스타일 반영
  document.querySelectorAll(".policy-item").forEach(item => item.classList.remove("selected"));
  event.currentTarget.classList.add("selected");
}

function stateLabel(state) {
  const map = { discovered: "발견", in_review: "검토중", applied: "신청완료", hidden: "숨김" };
  return map[state] || state || "-";
}

function escapeHtml(str) {
  return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ── 수집 결과 요약 ──
function renderCollectSummary(data) {
  if (!data || !Array.isArray(data.results)) return;
  const lines = ["=== 수집 결과 요약 ===", `대상 소스: ${(data.targets || []).join(", ")}`];
  for (const r of data.results) {
    const { total, persisted, skipped, failed } = r.ingest;
    lines.push(`\n[${r.source}]\n  수집: ${total}건  저장: ${persisted}건  스킵: ${skipped}건  실패: ${failed}건`);
  }
  if (data.skipped?.length) {
    lines.push("\n─── 제외된 소스 ───");
    data.skipped.forEach(s => lines.push(`  ${s.source}: ${s.reason}`));
  }
  if (data.failedSources?.length) {
    lines.push("\n─── 오류 ───");
    data.failedSources.forEach(s => lines.push(`  ${s.source}: ${s.message}`));
  }
  logText(lines.join("\n"));
}

// ── 탭 전환 ──
function initTabs() {
  el("authTabBar").addEventListener("click", (e) => {
    if (!e.target.classList.contains("tab")) return;
    const tab = e.target.dataset.tab;
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    e.target.classList.add("active");
    el("tab-signup").style.display = tab === "signup" ? "" : "none";
    el("tab-login").style.display = tab === "login" ? "" : "none";
  });
}

// ── helpers ──
function getCheckedInterests() {
  return [...document.querySelectorAll('input[name="signupInterest"]:checked')].map(i => i.value);
}

function getPolicyIdOrThrow() {
  const id = els.policyId.value.trim();
  if (!id) throw new Error("먼저 왼쪽 목록에서 정책을 클릭해 선택하세요.");
  return id;
}

// ── 이벤트 핸들러 ──
async function onSignup() {
  const interests = getCheckedInterests();
  if (!interests.length) throw new Error("관심 분야를 최소 1개 선택하세요.");
  const data = await apiRequest({
    method: "POST", path: "/auth/signup",
    body: {
      email: els.signupEmail.value.trim(),
      password: els.signupPassword.value,
      age: Number(els.signupAge.value),
      gender: els.signupGender.value,
      regionCode: els.signupRegion.value,
      interests,
    },
  });
  if (data?.accessToken) setToken(data.accessToken, els.signupEmail.value.trim());
}

async function onLogin() {
  const data = await apiRequest({
    method: "POST", path: "/auth/login",
    body: { email: els.loginEmail.value.trim(), password: els.loginPassword.value },
  });
  if (data?.accessToken) setToken(data.accessToken, els.loginEmail.value.trim());
}

async function onListPolicies() {
  const data = await apiRequest({
    method: "GET", path: "/policies", auth: true,
    query: {
      search: els.search.value.trim(),
      interest: els.interest.value,
      regionCode: els.regionCode.value,
      sortBy: els.sortBy.value,
      order: els.order.value,
      onlyAvailable: els.onlyAvailable.checked,
    },
  });
  renderPolicies(data.items || [], data.total);
}

// ── requirements 동적 폼 ──
function renderRequirementsForm(requirements) {
  const container = el("requirementsFields");
  const formWrap = el("requirementsForm");
  container.innerHTML = "";

  if (!requirements || requirements.length === 0) {
    formWrap.style.display = "none";
    return;
  }

  formWrap.style.display = "block";
  const profileKeys = new Set(["age"]); // 프로필에서 자동 입력되는 키

  requirements.forEach((req) => {
    if (profileKeys.has(req.key)) return; // 나이는 프로필에서 가져오므로 폼에 안 보여줌

    const div = document.createElement("div");
    div.className = "req-field";

    const label = document.createElement("label");
    label.textContent = req.label;
    if (req.isRequired) {
      const star = document.createElement("span");
      star.className = "req-required";
      star.textContent = "*필수";
      label.appendChild(star);
    }
    div.appendChild(label);

    if (req.description && req.description !== req.label) {
      const desc = document.createElement("div");
      desc.className = "req-desc";
      desc.textContent = req.description;
      div.appendChild(desc);
    }

    let input;
    if (req.type === "select" && Array.isArray(req.options) && req.options.length > 0) {
      input = document.createElement("select");
      input.dataset.key = req.key;
      const defaultOpt = document.createElement("option");
      defaultOpt.value = "";
      defaultOpt.textContent = "-- 선택 --";
      input.appendChild(defaultOpt);
      req.options.forEach((opt) => {
        const o = document.createElement("option");
        o.value = opt;
        o.textContent = opt;
        input.appendChild(o);
      });
    } else if (req.type === "number") {
      input = document.createElement("input");
      input.type = "number";
      input.dataset.key = req.key;
      input.placeholder = req.label;
    } else if (req.type === "boolean") {
      input = document.createElement("select");
      input.dataset.key = req.key;
      input.innerHTML = '<option value="">-- 선택 --</option><option value="true">예</option><option value="false">아니오</option>';
    } else {
      input = document.createElement("input");
      input.type = "text";
      input.dataset.key = req.key;
      input.placeholder = req.label;
    }

    div.appendChild(input);
    container.appendChild(div);
  });
}

function collectAnswersFromForm() {
  const answers = {};
  const fields = document.querySelectorAll("#requirementsFields [data-key]");
  fields.forEach((field) => {
    const key = field.dataset.key;
    let val = field.value;
    if (val === "" || val === undefined) return;
    if (field.type === "number") val = Number(val);
    if (val === "true") val = true;
    if (val === "false") val = false;
    answers[key] = val;
  });

  // JSON 직접 입력도 머지
  try {
    const manual = JSON.parse(els.answersJson.value || "{}");
    Object.assign(answers, manual);
  } catch {}

  return answers;
}

function renderEligibilityResult(data) {
  const container = el("eligibilityResult");
  container.style.display = "block";

  const resultMap = {
    eligible: { label: "신청 가능성 높음", cls: "eligible" },
    conditional: { label: "조건부 — 직접 확인 필요", cls: "conditional" },
    ineligible: { label: "신청 어려움", cls: "ineligible" },
  };
  const info = resultMap[data.result] || { label: data.result, cls: "conditional" };
  container.className = `eligibility-result ${info.cls}`;

  let html = `<div class="result-title">${info.label}</div>`;
  html += `<div>${escapeHtml(data.explanation || "")}</div>`;

  if (data.reasons && data.reasons.length > 0) {
    html += '<ul class="result-reasons">';
    data.reasons.forEach((r) => { html += `<li>${escapeHtml(r)}</li>`; });
    html += "</ul>";
  }

  if (data.unverifiedConditions && data.unverifiedConditions.length > 0) {
    html += '<div style="margin-top:6px;font-size:12px;color:#78350f"><strong>직접 확인 필요:</strong></div>';
    html += '<ul class="result-reasons">';
    data.unverifiedConditions.forEach((c) => { html += `<li>${escapeHtml(c)}</li>`; });
    html += "</ul>";
  }

  if (data.policy) {
    html += '<div class="result-actions">';
    if (data.policy.applicationUrl) {
      html += `<a href="${escapeHtml(data.policy.applicationUrl)}" target="_blank">신청 페이지 바로가기</a> `;
    }
    if (data.policy.sourceUrl) {
      html += `<a href="${escapeHtml(data.policy.sourceUrl)}" target="_blank">공고문 원문</a>`;
    }
    if (data.policy.applicationMethod) {
      html += `<div style="margin-top:4px">신청방법: ${escapeHtml(data.policy.applicationMethod)}</div>`;
    }
    html += "</div>";
  }

  container.innerHTML = html;
}

async function onCheckEligibility() {
  const id = getPolicyIdOrThrow();
  const answers = collectAnswersFromForm();
  const data = await apiRequest({ method: "POST", path: `/policies/${id}/check-eligibility`, auth: true, body: { answers } });
  renderEligibilityResult(data);
}

// ── 이벤트 연결 ──
function wireEvents() {
  els.saveBaseUrlBtn.addEventListener("click", () => {
    state.baseUrl = els.baseUrl.value.trim() || "http://localhost:4000";
    saveStorage();
    logText(`서버 주소 저장됨: ${state.baseUrl}`);
  });

  els.clearTokenBtn.addEventListener("click", () => {
    setToken("", null);
    logText("로그아웃됨. 토큰이 삭제되었습니다.");
  });

  els.copyLogBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(els.responseLog.textContent).then(() => {
      els.copyLogBtn.textContent = "복사됨!";
      setTimeout(() => (els.copyLogBtn.textContent = "복사"), 1500);
    });
  });

  els.clearLogBtn.addEventListener("click", () => { els.responseLog.textContent = ""; });

  els.signupBtn.addEventListener("click", () =>
    onSignup().catch(e => logResponse("회원가입", 0, { message: e.message }))
  );
  els.loginBtn.addEventListener("click", () =>
    onLogin().catch(e => logResponse("로그인", 0, { message: e.message }))
  );

  // 파이프라인
  els.sourcesBtn.addEventListener("click", () =>
    apiRequest({ method: "GET", path: "/pipeline/sources" })
      .catch(e => logResponse("sources", 0, { message: e.message }))
  );
  els.qualityReportBtn.addEventListener("click", () =>
    apiRequest({ method: "GET", path: "/pipeline/quality-report" })
      .catch(e => logResponse("quality-report", 0, { message: e.message }))
  );
  els.pruneMvpBtn.addEventListener("click", () => {
    if (!confirm("MVP 범위 밖 활성 정책을 모두 비활성화합니다. 계속할까요?")) return;
    apiRequest({ method: "POST", path: "/pipeline/prune-mvp" })
      .catch(e => logResponse("prune-mvp", 0, { message: e.message }));
  });

  els.enrichBtn.addEventListener("click", () => {
    setCollectLoading(true, "데이터 보강 (크롤링) 중... (약 1분 소요)");
    apiRequest({ method: "POST", path: "/pipeline/enrich-policies" })
      .catch(e => logResponse("enrich-policies", 0, { message: e.message }))
      .finally(() => setCollectLoading(false));
  });

  els.collectMvpBtn.addEventListener("click", () => {
    setCollectLoading(true, "MVP 전체 수집 중... (시간이 걸릴 수 있습니다)");
    apiRequest({ method: "POST", path: "/pipeline/collect-and-ingest-mvp" })
      .then(data => { logResponse("POST /pipeline/collect-and-ingest-mvp", 200, data); renderCollectSummary(data); })
      .catch(e => logResponse("collect-and-ingest-mvp", 0, { message: e.message }))
      .finally(() => setCollectLoading(false));
  });

  els.collectOneBtn.addEventListener("click", () => {
    const source = els.singleSource.value;
    setCollectLoading(true, `${source} 수집 중...`);
    apiRequest({ method: "POST", path: `/pipeline/collect-and-ingest/${source}` })
      .catch(e => logResponse(`collect ${source}`, 0, { message: e.message }))
      .finally(() => setCollectLoading(false));
  });

  // 정책
  els.listPoliciesBtn.addEventListener("click", () =>
    onListPolicies().catch(e => logResponse("GET /policies", 0, { message: e.message }))
  );
  els.policyDetailBtn.addEventListener("click", async () => {
    const id = els.policyId.value.trim();
    if (!id) { logText("왼쪽 목록에서 정책을 클릭해 선택하세요."); return; }
    try {
      const data = await apiRequest({ method: "GET", path: `/policies/${id}`, auth: true });
      renderRequirementsForm(data.requirements || []);
      el("eligibilityResult").style.display = "none";
    } catch (e) {
      logResponse("GET /policies/{id}", 0, { message: e.message });
    }
  });
  els.checkEligibilityBtn.addEventListener("click", () =>
    onCheckEligibility().catch(e => logResponse("POST /check-eligibility", 0, { message: e.message }))
  );
  els.updateStateBtn.addEventListener("click", () => {
    const id = els.policyId.value.trim();
    if (!id) { logText("왼쪽 목록에서 정책을 클릭해 선택하세요."); return; }
    apiRequest({
      method: "PATCH", path: `/me/policies/${id}/state`, auth: true,
      body: { state: els.policyState.value, note: els.policyNote.value.trim() || undefined },
    }).catch(e => logResponse("PATCH /me/policies/{id}/state", 0, { message: e.message }));
  });
  els.myPoliciesBtn.addEventListener("click", () =>
    apiRequest({ method: "GET", path: "/me/policies", auth: true })
      .catch(e => logResponse("GET /me/policies", 0, { message: e.message }))
  );
}

// ── 초기화 ──
function init() {
  loadStorage();
  els.baseUrl.value = state.baseUrl;
  updateAuthStatus(null);
  initTabs();
  wireEvents();
  logText("Bengo Test UI 준비됨.\n\n순서: ① 파이프라인에서 데이터 수집 → ② 회원가입/로그인 → ③ 정책 목록 조회");
}

init();
