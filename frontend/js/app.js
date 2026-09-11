const form = document.getElementById("ticketForm");
const submitButton = document.getElementById("submitButton");
const analyseButton = document.getElementById("analyseButton");
const formAlert = document.getElementById("formAlert");
const description = document.getElementById("description");
const descriptionCount = document.getElementById("descriptionCount");
const serverStatus = document.getElementById("serverStatus");
const successModal = document.getElementById("successModal");
const newTicketButton = document.getElementById("newTicketButton");
let latestAnalysis = null;

const samples = {
  wifi: { device_type: "Windows laptop", title: "Wi-Fi keeps disconnecting", description: "My laptop disconnects from Wi-Fi every few minutes while I am working. Reconnecting works briefly, but the issue keeps returning and I cannot stay in video calls." },
  password: { device_type: "Windows laptop", title: "Cannot sign in after password reset", description: "I reset my account password today, but my laptop keeps saying the password is incorrect and I cannot sign in to my work account." },
  security: { device_type: "Windows laptop", title: "Suspicious email and sign-in alert", description: "I received a suspicious email asking me to verify my account, and shortly afterwards I received an unexpected sign-in alert from another location." },
  software: { device_type: "Windows laptop", title: "Application crashes when opening", description: "The application closes immediately every time I try to open it. I restarted the laptop, but the application still crashes on launch." }
};

function setServerStatus(state, message) {
  serverStatus.classList.remove("online", "offline");
  if (state) serverStatus.classList.add(state);
  serverStatus.querySelector("span:last-child").textContent = message;
}

async function checkHealth() {
  try {
    const response = await fetch("/health", { cache: "no-store" });
    if (!response.ok) throw new Error();
    const data = await response.json();
    if (data.status === "ok") return setServerStatus("online", "API online");
    throw new Error();
  } catch { setServerStatus("offline", "API unavailable"); }
}

function updateDescriptionCount() { descriptionCount.textContent = `${description.value.length} / 5000`; }
function clearValidation() {
  document.querySelectorAll(".field-error").forEach((el) => el.textContent = "");
  document.querySelectorAll(".invalid").forEach((el) => el.classList.remove("invalid"));
  formAlert.hidden = true; formAlert.textContent = "";
}
function showFieldError(fieldName, message) {
  const field = form.elements[fieldName];
  const error = document.querySelector(`[data-error-for="${fieldName}"]`);
  if (field) field.classList.add("invalid");
  if (error) error.textContent = message;
}
function validateIssueOnly() {
  clearValidation(); let valid = true;
  const title = form.elements.title.value.trim(); const issueDescription = form.elements.description.value.trim();
  if (title.length < 3) { showFieldError("title", "Please enter at least 3 characters."); valid = false; }
  if (issueDescription.length < 10) { showFieldError("description", "Please describe the issue in at least 10 characters."); valid = false; }
  return valid;
}
function validateForm() {
  const validIssue = validateIssueOnly(); let valid = validIssue;
  const name = form.elements.name.value.trim(); const email = form.elements.email.value.trim();
  if (name.length < 2) { showFieldError("name", "Please enter at least 2 characters."); valid = false; }
  if (!/^\S+@\S+\.\S+$/.test(email)) { showFieldError("email", "Please enter a valid email address."); valid = false; }
  return valid;
}
function issuePayload() { return { title: form.elements.title.value.trim(), description: form.elements.description.value.trim(), device_type: form.elements.device_type.value || null }; }
function setBusy(button, busy) { button.disabled = busy; button.classList.toggle("loading", busy); }

function resetAnalysisState() {
  latestAnalysis = null;
  document.getElementById("analysisResult").hidden = true;
  document.getElementById("analysisEmpty").hidden = false;
  document.getElementById("analysisState").textContent = "Not analysed";
  document.getElementById("analysisState").classList.remove("ready");
}

function requesterContext() {
  const name = form.elements.name.value.trim();
  const email = form.elements.email.value.trim();
  const initials = name
    ? name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join("")
    : "U";
  return { name: name || "Requester", email: email || "No email provided", initials };
}

function renderRequesterChat(data) {
  const requester = requesterContext();
  document.getElementById("chatUserName").textContent = requester.name;
  document.getElementById("chatUserEmail").textContent = requester.email;
  document.getElementById("chatUserInitials").textContent = requester.initials;
  document.getElementById("chatUserMessage").textContent = `${form.elements.title.value.trim()} — ${form.elements.description.value.trim()}`;
  document.getElementById("chatBotMessage").textContent = `Hi ${requester.name}. I analysed your request as ${data.category} with ${data.priority} priority. The troubleshooting matches below are the evidence I found for this issue.`;
}

function renderAnalysis(data) {
  latestAnalysis = data;
  renderRequesterChat(data);
  document.getElementById("analysisEmpty").hidden = true;
  document.getElementById("analysisResult").hidden = false;
  document.getElementById("analysisState").textContent = "Analysed";
  document.getElementById("analysisState").classList.add("ready");
  document.getElementById("analysisCategory").textContent = data.category;
  document.getElementById("analysisConfidence").textContent = `${Math.round(data.confidence * 100)}% model confidence`;
  const priorityEl = document.getElementById("analysisPriority");
  priorityEl.textContent = data.priority; priorityEl.dataset.priority = data.priority;
  document.getElementById("priorityReasons").innerHTML = data.priority_reasons.map((r) => `<li>${escapeHtml(r)}</li>`).join("");
  document.getElementById("suggestionList").innerHTML = data.suggestions.map((a, i) => `
    <article class="suggestion-card"><div class="suggestion-head"><span>${i + 1}</span><div><strong>${escapeHtml(a.title)}</strong><small>${Math.round(a.similarity * 100)}% retrieval similarity</small></div></div><p>${escapeHtml(a.solution)}</p></article>
  `).join("");
}
function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

async function analyseIssue() {
  if (!validateIssueOnly()) return;
  setBusy(analyseButton, true);
  document.getElementById("analysisState").textContent = "Analysing…";
  try {
    const response = await fetch("/analyse-issue", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(issuePayload()) });
    const data = await response.json(); if (!response.ok) throw new Error("Unable to analyse this issue.");
    renderAnalysis(data);
  } catch (error) { formAlert.textContent = error.message; formAlert.hidden = false; document.getElementById("analysisState").textContent = "Analysis failed"; }
  finally { setBusy(analyseButton, false); }
}

analyseButton.addEventListener("click", analyseIssue);

form.addEventListener("submit", async (event) => {
  event.preventDefault(); if (!validateForm()) return;
  setBusy(submitButton, true); formAlert.hidden = true;
  const payload = { name: form.elements.name.value.trim(), email: form.elements.email.value.trim(), ...issuePayload() };
  if (latestAnalysis) { payload.category = latestAnalysis.category; payload.priority = latestAnalysis.priority; }
  try {
    const response = await fetch("/tickets", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(payload) });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.detail?.[0]?.msg || data?.detail || "The ticket could not be created.");
    document.getElementById("receiptRequester").textContent = data.name;
    document.getElementById("receiptEmail").textContent = data.email;
    document.getElementById("receiptTicketNumber").textContent = data.ticket_number;
    document.getElementById("receiptStatus").textContent = data.status;
    document.getElementById("receiptCategory").textContent = data.category;
    document.getElementById("receiptPriority").textContent = data.priority;

    // Tell an already-open technician dashboard to refresh immediately.
    if ("BroadcastChannel" in window) {
      const channel = new BroadcastChannel("helpdesk-events");
      channel.postMessage({ type: "ticket-created", ticketId: data.id, ticketNumber: data.ticket_number });
      channel.close();
    }
    // storage events provide a fallback for browsers/tabs without BroadcastChannel delivery.
    localStorage.setItem("helpdesk:lastTicketCreated", `${Date.now()}:${data.id}`);

    successModal.hidden = false; document.body.style.overflow = "hidden";
  } catch (error) { formAlert.textContent = error.message || "Unable to connect to the helpdesk API."; formAlert.hidden = false; }
  finally { setBusy(submitButton, false); }
});

document.getElementById("sampleButtons").addEventListener("click", (event) => {
  const button = event.target.closest("[data-sample]"); if (!button) return;
  const sample = samples[button.dataset.sample]; if (!sample) return;
  form.elements.device_type.value = sample.device_type; form.elements.title.value = sample.title; form.elements.description.value = sample.description;
  resetAnalysisState();
  updateDescriptionCount(); clearValidation(); form.elements.title.focus();
});

description.addEventListener("input", () => { updateDescriptionCount(); resetAnalysisState(); });
form.elements.title.addEventListener("input", resetAnalysisState);
form.elements.device_type.addEventListener("change", resetAnalysisState);
[form.elements.name, form.elements.email].forEach((field) => {
  field.addEventListener("input", () => { if (latestAnalysis) renderRequesterChat(latestAnalysis); });
});
newTicketButton.addEventListener("click", () => { successModal.hidden = true; document.body.style.overflow = ""; form.reset(); resetAnalysisState(); updateDescriptionCount(); form.elements.name.focus(); });
successModal.addEventListener("click", (event) => { if (event.target === successModal) { successModal.hidden = true; document.body.style.overflow = ""; } });
document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !successModal.hidden) { successModal.hidden = true; document.body.style.overflow = ""; } });
updateDescriptionCount(); checkHealth();
