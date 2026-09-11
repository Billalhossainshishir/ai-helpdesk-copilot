let tickets = [];
let selectedTicket = null;
let charts = {};
let autoRefreshTimer = null;

const ticketRows = document.getElementById("ticketRows");
const drawer = document.getElementById("ticketDrawer");
const backdrop = document.getElementById("drawerBackdrop");
const syncStatus = document.getElementById("dashboardSyncStatus");

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[c]));
}

function fmtDate(value) {
  return value ? new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "—";
}

function badge(value, kind) {
  const safeValue = value || "Unknown";
  return `<span class="badge ${kind}-${String(safeValue).toLowerCase().replaceAll(" ", "-")}">${escapeHtml(safeValue)}</span>`;
}

function errorMessage(data, fallback) {
  if (typeof data?.detail === "string") return data.detail;
  if (Array.isArray(data?.detail) && data.detail[0]?.msg) return data.detail[0].msg;
  return fallback;
}

function setSyncStatus(message, state = "ok") {
  if (!syncStatus) return;
  syncStatus.textContent = message;
  syncStatus.dataset.state = state;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(errorMessage(data, `Request failed (${response.status})`));
  return data;
}

async function loadDashboard({ silent = false } = {}) {
  if (!silent) setSyncStatus("Refreshing…", "loading");

  const [analyticsResult, ticketsResult] = await Promise.allSettled([
    api("/analytics"),
    api("/tickets?limit=500")
  ]);

  const errors = [];

  if (analyticsResult.status === "fulfilled") {
    renderKpis(analyticsResult.value);
    renderCharts(analyticsResult.value);
  } else {
    console.error("Analytics failed:", analyticsResult.reason);
    errors.push(`analytics: ${analyticsResult.reason.message}`);
  }

  if (ticketsResult.status === "fulfilled") {
    tickets = ticketsResult.value;
    renderTickets();
  } else {
    console.error("Ticket list failed:", ticketsResult.reason);
    errors.push(`tickets: ${ticketsResult.reason.message}`);
    ticketRows.innerHTML = `<tr><td colspan="7">Unable to load tickets: ${escapeHtml(ticketsResult.reason.message)}</td></tr>`;
    document.getElementById("tableEmpty").hidden = true;
  }

  if (errors.length) {
    setSyncStatus(`Partial sync error · ${errors.join(" · ")}`, "error");
  } else {
    setSyncStatus(`Live · ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`, "ok");
  }

  if (analyticsResult.status === "rejected" && ticketsResult.status === "rejected") {
    throw new Error(errors.join(" · "));
  }
}

function renderKpis(a) {
  document.getElementById("kpiOpen").textContent = a.open_tickets;
  document.getElementById("kpiCritical").textContent = a.critical_tickets;
  document.getElementById("kpiResolved").textContent = a.resolved_today;
  document.getElementById("kpiAverage").textContent = a.average_resolution_minutes == null ? "—" : Math.round(a.average_resolution_minutes);
  document.getElementById("kpiRate").textContent = `${a.resolution_percentage}%`;
}

function upsertChart(id, type, labels, values, label) {
  if (!window.Chart) return;
  if (charts[id]) charts[id].destroy();

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } }
  };

  if (type !== "doughnut") {
    options.scales = {
      y: { beginAtZero: true, ticks: { precision: 0 } },
      x: { grid: { display: false } }
    };
  }

  charts[id] = new Chart(document.getElementById(id), {
    type,
    data: { labels, datasets: [{ label, data: values, borderWidth: 2, tension: 0.28 }] },
    options
  });
}

function renderCharts(a) {
  upsertChart("categoryChart", "bar", Object.keys(a.by_category || {}), Object.values(a.by_category || {}), "Tickets");
  upsertChart("priorityChart", "doughnut", Object.keys(a.by_priority || {}), Object.values(a.by_priority || {}), "Tickets");
  upsertChart("dailyChart", "line", (a.tickets_per_day || []).map((x) => x.date), (a.tickets_per_day || []).map((x) => x.count), "Tickets");
}

function renderTickets() {
  const q = document.getElementById("searchFilter").value.trim().toLowerCase();
  const status = document.getElementById("statusFilter").value;
  const priority = document.getElementById("priorityFilter").value;
  const category = document.getElementById("categoryFilter").value;

  const filtered = tickets.filter((t) => {
    const searchable = `${t.ticket_number} ${t.name} ${t.email} ${t.title} ${t.description} ${t.device_type || ""}`.toLowerCase();
    return (!q || searchable.includes(q))
      && (!status || t.status === status)
      && (!priority || t.priority === priority)
      && (!category || t.category === category);
  });

  ticketRows.innerHTML = filtered.map((t) => `
    <tr data-ticket-id="${t.id}">
      <td>
        <strong>${escapeHtml(t.ticket_number)}</strong>
        <small class="requester-name">${escapeHtml(t.name)}</small>
        <small>${escapeHtml(t.email)}</small>
      </td>
      <td><strong>${escapeHtml(t.title)}</strong><small>${escapeHtml(t.device_type || "No device")}</small></td>
      <td>${badge(t.category, "category")}</td>
      <td>${badge(t.priority, "priority")}</td>
      <td>${badge(t.status, "status")}</td>
      <td>${escapeHtml(t.assigned_to || "Unassigned")}</td>
      <td>${fmtDate(t.created_at)}</td>
    </tr>
  `).join("");

  document.getElementById("tableEmpty").hidden = filtered.length > 0;
}

async function openTicket(id) {
  try {
    selectedTicket = await api(`/tickets/${id}`);
    document.getElementById("drawerNumber").textContent = selectedTicket.ticket_number;
    document.getElementById("drawerTitle").textContent = selectedTicket.title;
    document.getElementById("drawerDescription").textContent = selectedTicket.description;
    document.getElementById("drawerCategory").textContent = selectedTicket.category;
    document.getElementById("drawerPriority").textContent = selectedTicket.priority;
    document.getElementById("drawerStatus").textContent = selectedTicket.status;
    document.getElementById("drawerRequester").textContent = `${selectedTicket.name} · ${selectedTicket.email}`;
    document.getElementById("drawerDevice").textContent = selectedTicket.device_type || "—";
    document.getElementById("drawerCreated").textContent = fmtDate(selectedTicket.created_at);
    document.getElementById("drawerAssigned").textContent = selectedTicket.assigned_to || "Unassigned";
    document.getElementById("manageStatus").value = selectedTicket.status;
    document.getElementById("manageAssignee").value = selectedTicket.assigned_to || "";
    document.getElementById("resolutionText").value = selectedTicket.resolution || "";

    const [notesResult, similarResult] = await Promise.allSettled([loadNotes(), loadSimilar()]);
    if (notesResult.status === "rejected") console.error(notesResult.reason);
    if (similarResult.status === "rejected") console.error(similarResult.reason);

    drawer.hidden = false;
    backdrop.hidden = false;
    requestAnimationFrame(() => drawer.classList.add("open"));
    document.body.style.overflow = "hidden";
  } catch (error) {
    setSyncStatus(`Unable to open ticket · ${error.message}`, "error");
  }
}

function closeTicket() {
  drawer.classList.remove("open");
  setTimeout(() => { drawer.hidden = true; }, 180);
  backdrop.hidden = true;
  document.body.style.overflow = "";
}

async function loadNotes() {
  const notes = await api(`/tickets/${selectedTicket.id}/notes`);
  document.getElementById("notesList").innerHTML = notes.length
    ? notes.map((n) => `<article class="note"><div><strong>${escapeHtml(n.author)}</strong><small>${fmtDate(n.created_at)}</small></div><p>${escapeHtml(n.note)}</p></article>`).join("")
    : '<p class="muted">No internal notes yet.</p>';
}

async function loadSimilar() {
  const items = await api(`/tickets/${selectedTicket.id}/similar`);
  document.getElementById("similarList").innerHTML = items.length
    ? items.map((x) => `<article class="similar"><div><strong>${escapeHtml(x.title)}</strong><small>${Math.round(x.similarity * 100)}% similar · ${escapeHtml(x.ticket_number)}</small></div><p>${escapeHtml(x.resolution)}</p></article>`).join("")
    : '<p class="muted">No resolved incidents available for comparison yet.</p>';
}

async function safeAction(action) {
  try {
    await action();
  } catch (error) {
    console.error(error);
    setSyncStatus(error.message, "error");
  }
}

ticketRows.addEventListener("click", (event) => {
  const row = event.target.closest("tr[data-ticket-id]");
  if (row) openTicket(Number(row.dataset.ticketId));
});

document.getElementById("closeDrawer").addEventListener("click", closeTicket);
backdrop.addEventListener("click", closeTicket);

["searchFilter", "statusFilter", "priorityFilter", "categoryFilter"].forEach((id) => {
  document.getElementById(id).addEventListener(id === "searchFilter" ? "input" : "change", renderTickets);
});

document.getElementById("refreshDashboard").addEventListener("click", () => safeAction(() => loadDashboard()));

document.getElementById("resetDemo").addEventListener("click", () => safeAction(async () => {
  await api("/demo/reset", { method: "POST" });
  await loadDashboard();
}));

document.getElementById("saveTicket").addEventListener("click", () => safeAction(async () => {
  if (!selectedTicket) return;
  const ticketId = selectedTicket.id;
  await api(`/tickets/${ticketId}`, {
    method: "PATCH",
    body: JSON.stringify({
      status: document.getElementById("manageStatus").value,
      assigned_to: document.getElementById("manageAssignee").value.trim() || null
    })
  });
  await loadDashboard();
  await openTicket(ticketId);
}));

document.getElementById("addNote").addEventListener("click", () => safeAction(async () => {
  if (!selectedTicket) return;
  const author = document.getElementById("noteAuthor").value.trim();
  const note = document.getElementById("noteText").value.trim();
  if (author.length < 2 || note.length < 2) return;
  await api(`/tickets/${selectedTicket.id}/notes`, {
    method: "POST",
    body: JSON.stringify({ author, note })
  });
  document.getElementById("noteText").value = "";
  await loadNotes();
}));

document.getElementById("resolveTicket").addEventListener("click", () => safeAction(async () => {
  if (!selectedTicket) return;
  const ticketId = selectedTicket.id;
  const resolution = document.getElementById("resolutionText").value.trim();
  if (resolution.length < 3) return;
  await api(`/tickets/${ticketId}/resolve`, {
    method: "POST",
    body: JSON.stringify({
      resolution,
      resolved_by: document.getElementById("manageAssignee").value.trim() || "Demo Technician"
    })
  });
  await loadDashboard();
  await openTicket(ticketId);
}));

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !drawer.hidden) closeTicket();
});

// Immediate same-browser updates after a customer submits a ticket.
if ("BroadcastChannel" in window) {
  const channel = new BroadcastChannel("helpdesk-events");
  channel.addEventListener("message", (event) => {
    if (event.data?.type === "ticket-created") safeAction(() => loadDashboard({ silent: true }));
  });
}

window.addEventListener("storage", (event) => {
  if (event.key === "helpdesk:lastTicketCreated") safeAction(() => loadDashboard({ silent: true }));
});

window.addEventListener("focus", () => safeAction(() => loadDashboard({ silent: true })));
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) safeAction(() => loadDashboard({ silent: true }));
});

// Polling is the cross-browser/tab fallback. New reports appear without pressing Refresh.
autoRefreshTimer = window.setInterval(() => {
  if (!document.hidden) safeAction(() => loadDashboard({ silent: true }));
}, 5000);

safeAction(() => loadDashboard());
