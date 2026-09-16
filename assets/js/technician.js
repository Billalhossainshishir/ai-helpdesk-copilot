(function () {
  "use strict";

  var STORAGE_KEY = "ai-helpdesk-copilot-demo-tickets";
  var tickets = [];
  var selectedTicket = null;
  var charts = {};

  var ticketRows = document.getElementById("ticketRows");
  var drawer = document.getElementById("ticketDrawer");
  var backdrop = document.getElementById("drawerBackdrop");
  var syncStatus = document.getElementById("dashboardSyncStatus");

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>'"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c];
    });
  }

  function seedTickets() {
    var now = Date.now();
    return [
      {
        id: "demo-1",
        ticket_number: "DEMO-0001",
        name: "Mia Chen",
        email: "mia.demo@example.com",
        title: "VPN disconnects during meetings",
        description: "The VPN disconnects several times during video meetings and reconnecting only works for a few minutes.",
        device_type: "Windows laptop",
        category: "Network",
        priority: "High",
        status: "Open",
        assigned_to: null,
        created_at: new Date(now - 35 * 60 * 1000).toISOString(),
        resolved_at: null,
        resolution: null,
        notes: []
      },
      {
        id: "demo-2",
        ticket_number: "DEMO-0002",
        name: "Noah Patel",
        email: "noah.demo@example.com",
        title: "Suspicious sign-in after phishing email",
        description: "I opened a suspicious email and then received a sign-in alert from a location I do not recognise.",
        device_type: "MacBook",
        category: "Security",
        priority: "Critical",
        status: "In Progress",
        assigned_to: "A. Technician",
        created_at: new Date(now - 92 * 60 * 1000).toISOString(),
        resolved_at: null,
        resolution: null,
        notes: [{ author: "A. Technician", note: "Account sessions are being reviewed and the requester has been asked to reset credentials.", created_at: new Date(now - 74 * 60 * 1000).toISOString() }]
      },
      {
        id: "demo-3",
        ticket_number: "DEMO-0003",
        name: "Olivia Smith",
        email: "olivia.demo@example.com",
        title: "Outlook not receiving new messages",
        description: "Outlook has stopped receiving new messages but webmail still works.",
        device_type: "Windows laptop",
        category: "Email",
        priority: "Medium",
        status: "Waiting",
        assigned_to: "J. Support",
        created_at: new Date(now - 4 * 60 * 60 * 1000).toISOString(),
        resolved_at: null,
        resolution: null,
        notes: []
      },
      {
        id: "demo-4",
        ticket_number: "DEMO-0004",
        name: "Ethan Brown",
        email: "ethan.demo@example.com",
        title: "Wi-Fi adapter stopped reconnecting",
        description: "The laptop could see wireless networks but would not reconnect after sleep.",
        device_type: "Windows laptop",
        category: "Network",
        priority: "Medium",
        status: "Resolved",
        assigned_to: "J. Support",
        created_at: new Date(now - 27 * 60 * 60 * 1000).toISOString(),
        resolved_at: new Date(now - 25 * 60 * 60 * 1000).toISOString(),
        resolution: "Reset the wireless adapter, removed the old network profile and installed the approved driver update.",
        notes: []
      },
      {
        id: "demo-5",
        ticket_number: "DEMO-0005",
        name: "Sofia Wilson",
        email: "sofia.demo@example.com",
        title: "Application crashes after update",
        description: "The application closed on startup after yesterday's update.",
        device_type: "Windows laptop",
        category: "Software",
        priority: "Medium",
        status: "Resolved",
        assigned_to: "A. Technician",
        created_at: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
        resolved_at: new Date(now - 2 * 24 * 60 * 60 * 1000 + 68 * 60 * 1000).toISOString(),
        resolution: "Used the application repair tool and cleared the corrupted local cache created during the update.",
        notes: []
      }
    ];
  }

  function readTickets() {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      var seeded = seedTickets();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    try {
      var parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch (error) {}
    var fresh = seedTickets();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    return fresh;
  }

  function writeTickets() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
    localStorage.setItem("ai-helpdesk-copilot-last-change", String(Date.now()));
  }

  function setSyncStatus(message, state) {
    syncStatus.textContent = message;
    syncStatus.dataset.state = state || "ok";
  }

  function fmtDate(value) {
    if (!value) return "—";
    return new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
  }

  function badge(value, kind) {
    var safeValue = value || "Unknown";
    var css = String(safeValue).toLowerCase().replaceAll(" ", "-");
    return '<span class="badge ' + kind + "-" + css + '">' + escapeHtml(safeValue) + "</span>";
  }

  function sameLocalDay(a, b) {
    var da = new Date(a);
    var db = new Date(b);
    return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
  }

  function analytics() {
    var now = new Date();
    var open = tickets.filter(function (t) { return t.status !== "Resolved" && t.status !== "Closed"; }).length;
    var critical = tickets.filter(function (t) { return t.priority === "Critical" && t.status !== "Resolved" && t.status !== "Closed"; }).length;
    var resolved = tickets.filter(function (t) { return !!t.resolved_at; });
    var resolvedToday = resolved.filter(function (t) { return sameLocalDay(t.resolved_at, now); }).length;
    var durations = resolved.map(function (t) {
      return Math.max(0, (new Date(t.resolved_at).getTime() - new Date(t.created_at).getTime()) / 60000);
    });
    var avg = durations.length ? durations.reduce(function (a, b) { return a + b; }, 0) / durations.length : null;
    var rate = tickets.length ? Math.round((resolved.length / tickets.length) * 100) : 0;

    var byCategory = {};
    var byPriority = {};
    tickets.forEach(function (t) {
      byCategory[t.category] = (byCategory[t.category] || 0) + 1;
      byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
    });

    var dailyMap = {};
    tickets.forEach(function (t) {
      var key = new Date(t.created_at).toISOString().slice(0, 10);
      dailyMap[key] = (dailyMap[key] || 0) + 1;
    });
    var daily = Object.keys(dailyMap).sort().map(function (key) { return { date: key, count: dailyMap[key] }; });

    return {
      open_tickets: open,
      critical_tickets: critical,
      resolved_today: resolvedToday,
      average_resolution_minutes: avg,
      resolution_percentage: rate,
      by_category: byCategory,
      by_priority: byPriority,
      tickets_per_day: daily
    };
  }

  function renderKpis(a) {
    document.getElementById("kpiOpen").textContent = a.open_tickets;
    document.getElementById("kpiCritical").textContent = a.critical_tickets;
    document.getElementById("kpiResolved").textContent = a.resolved_today;
    document.getElementById("kpiAverage").textContent = a.average_resolution_minutes == null ? "—" : Math.round(a.average_resolution_minutes);
    document.getElementById("kpiRate").textContent = a.resolution_percentage + "%";
  }

  function upsertChart(id, type, labels, values, label) {
    if (!window.Chart) return;
    if (charts[id]) charts[id].destroy();
    var options = {
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
      type: type,
      data: { labels: labels, datasets: [{ label: label, data: values, borderWidth: 2, tension: 0.28 }] },
      options: options
    });
  }

  function renderCharts(a) {
    upsertChart("categoryChart", "bar", Object.keys(a.by_category), Object.values(a.by_category), "Tickets");
    upsertChart("priorityChart", "doughnut", Object.keys(a.by_priority), Object.values(a.by_priority), "Tickets");
    upsertChart("dailyChart", "line", a.tickets_per_day.map(function (x) { return x.date; }), a.tickets_per_day.map(function (x) { return x.count; }), "Tickets");
  }

  function renderTickets() {
    var q = document.getElementById("searchFilter").value.trim().toLowerCase();
    var status = document.getElementById("statusFilter").value;
    var priority = document.getElementById("priorityFilter").value;
    var category = document.getElementById("categoryFilter").value;

    var filtered = tickets.filter(function (t) {
      var searchable = (t.ticket_number + " " + t.name + " " + t.email + " " + t.title + " " + t.description + " " + (t.device_type || "")).toLowerCase();
      return (!q || searchable.indexOf(q) !== -1)
        && (!status || t.status === status)
        && (!priority || t.priority === priority)
        && (!category || t.category === category);
    });

    ticketRows.innerHTML = filtered.map(function (t) {
      return '<tr data-ticket-id="' + escapeHtml(t.id) + '">'
        + '<td><strong>' + escapeHtml(t.ticket_number) + '</strong><small class="requester-name">' + escapeHtml(t.name) + '</small><small>' + escapeHtml(t.email) + '</small></td>'
        + '<td><strong>' + escapeHtml(t.title) + '</strong><small>' + escapeHtml(t.device_type || "No device") + '</small></td>'
        + '<td>' + badge(t.category, "category") + '</td>'
        + '<td>' + badge(t.priority, "priority") + '</td>'
        + '<td>' + badge(t.status, "status") + '</td>'
        + '<td>' + escapeHtml(t.assigned_to || "Unassigned") + '</td>'
        + '<td>' + fmtDate(t.created_at) + '</td>'
        + '</tr>';
    }).join("");

    document.getElementById("tableEmpty").hidden = filtered.length > 0;
  }

  function refreshDashboard(message) {
    tickets = readTickets();
    var a = analytics();
    renderKpis(a);
    renderCharts(a);
    renderTickets();
    setSyncStatus(message || ("Browser data · " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })), "ok");
  }

  function tokenSet(text) {
    return new Set(String(text || "").toLowerCase().match(/[a-z0-9]+/g) || []);
  }

  function similarity(a, b) {
    var sa = tokenSet(a);
    var sb = tokenSet(b);
    if (!sa.size || !sb.size) return 0;
    var intersection = 0;
    sa.forEach(function (token) {
      if (sb.has(token)) intersection += 1;
    });
    return intersection / Math.sqrt(sa.size * sb.size);
  }

  function similarResolved(ticket) {
    var target = ticket.title + " " + ticket.description;
    return tickets.filter(function (t) {
      return t.id !== ticket.id && t.resolution && (t.status === "Resolved" || t.status === "Closed");
    }).map(function (t) {
      var base = similarity(target, t.title + " " + t.description);
      if (t.category === ticket.category) base += 0.25;
      return { ticket: t, similarity: Math.min(0.99, base) };
    }).sort(function (a, b) { return b.similarity - a.similarity; }).slice(0, 3);
  }

  function renderNotes(ticket) {
    var notes = Array.isArray(ticket.notes) ? ticket.notes : [];
    document.getElementById("notesList").innerHTML = notes.length
      ? notes.map(function (n) {
          return '<article class="note"><div><strong>' + escapeHtml(n.author) + '</strong><small>' + fmtDate(n.created_at) + '</small></div><p>' + escapeHtml(n.note) + '</p></article>';
        }).join("")
      : '<p class="muted">No internal notes yet.</p>';
  }

  function renderSimilar(ticket) {
    var items = similarResolved(ticket);
    document.getElementById("similarList").innerHTML = items.length
      ? items.map(function (item) {
          return '<article class="similar"><div><strong>' + escapeHtml(item.ticket.title) + '</strong><small>' + Math.round(item.similarity * 100) + '% demo similarity · ' + escapeHtml(item.ticket.ticket_number) + '</small></div><p>' + escapeHtml(item.ticket.resolution) + '</p></article>';
        }).join("")
      : '<p class="muted">No resolved incidents available for comparison yet.</p>';
  }

  function openTicket(id) {
    tickets = readTickets();
    selectedTicket = tickets.find(function (t) { return String(t.id) === String(id); });
    if (!selectedTicket) return;

    document.getElementById("drawerNumber").textContent = selectedTicket.ticket_number;
    document.getElementById("drawerTitle").textContent = selectedTicket.title;
    document.getElementById("drawerDescription").textContent = selectedTicket.description;
    document.getElementById("drawerCategory").textContent = selectedTicket.category;
    document.getElementById("drawerPriority").textContent = selectedTicket.priority;
    document.getElementById("drawerStatus").textContent = selectedTicket.status;
    document.getElementById("drawerRequester").textContent = selectedTicket.name + " · " + selectedTicket.email;
    document.getElementById("drawerDevice").textContent = selectedTicket.device_type || "—";
    document.getElementById("drawerCreated").textContent = fmtDate(selectedTicket.created_at);
    document.getElementById("drawerAssigned").textContent = selectedTicket.assigned_to || "Unassigned";
    document.getElementById("manageStatus").value = selectedTicket.status;
    document.getElementById("manageAssignee").value = selectedTicket.assigned_to || "";
    document.getElementById("resolutionText").value = selectedTicket.resolution || "";

    renderNotes(selectedTicket);
    renderSimilar(selectedTicket);

    drawer.hidden = false;
    backdrop.hidden = false;
    window.requestAnimationFrame(function () { drawer.classList.add("open"); });
    document.body.style.overflow = "hidden";
  }

  function closeTicket() {
    drawer.classList.remove("open");
    window.setTimeout(function () { drawer.hidden = true; }, 180);
    backdrop.hidden = true;
    document.body.style.overflow = "";
  }

  function persistSelected(mutator) {
    if (!selectedTicket) return;
    tickets = readTickets();
    var index = tickets.findIndex(function (t) { return String(t.id) === String(selectedTicket.id); });
    if (index < 0) return;
    mutator(tickets[index]);
    selectedTicket = tickets[index];
    writeTickets();
    refreshDashboard();
    openTicket(selectedTicket.id);
  }

  ticketRows.addEventListener("click", function (event) {
    var row = event.target.closest("tr[data-ticket-id]");
    if (row) openTicket(row.dataset.ticketId);
  });

  document.getElementById("closeDrawer").addEventListener("click", closeTicket);
  backdrop.addEventListener("click", closeTicket);

  ["searchFilter", "statusFilter", "priorityFilter", "categoryFilter"].forEach(function (id) {
    document.getElementById(id).addEventListener(id === "searchFilter" ? "input" : "change", renderTickets);
  });

  document.getElementById("refreshDashboard").addEventListener("click", function () {
    refreshDashboard("Refreshed · browser data");
  });

  document.getElementById("resetDemo").addEventListener("click", function () {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedTickets()));
    selectedTicket = null;
    closeTicket();
    refreshDashboard("Demo reset · sample data restored");
  });

  document.getElementById("saveTicket").addEventListener("click", function () {
    persistSelected(function (ticket) {
      ticket.status = document.getElementById("manageStatus").value;
      ticket.assigned_to = document.getElementById("manageAssignee").value.trim() || null;
      if ((ticket.status === "Resolved" || ticket.status === "Closed") && !ticket.resolved_at) {
        ticket.resolved_at = new Date().toISOString();
      }
    });
  });

  document.getElementById("addNote").addEventListener("click", function () {
    var author = document.getElementById("noteAuthor").value.trim();
    var note = document.getElementById("noteText").value.trim();
    if (author.length < 2 || note.length < 2) {
      setSyncStatus("Enter an author and note before saving.", "error");
      return;
    }
    persistSelected(function (ticket) {
      if (!Array.isArray(ticket.notes)) ticket.notes = [];
      ticket.notes.push({ author: author, note: note, created_at: new Date().toISOString() });
    });
    document.getElementById("noteText").value = "";
  });

  document.getElementById("resolveTicket").addEventListener("click", function () {
    var resolution = document.getElementById("resolutionText").value.trim();
    if (resolution.length < 3) {
      setSyncStatus("Add a short resolution before resolving the ticket.", "error");
      return;
    }
    persistSelected(function (ticket) {
      ticket.resolution = resolution;
      ticket.status = "Resolved";
      ticket.resolved_at = new Date().toISOString();
      ticket.assigned_to = document.getElementById("manageAssignee").value.trim() || ticket.assigned_to || "Demo Technician";
    });
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !drawer.hidden) closeTicket();
  });

  if ("BroadcastChannel" in window) {
    var channel = new BroadcastChannel("ai-helpdesk-copilot-demo");
    channel.addEventListener("message", function () {
      refreshDashboard("New demo ticket received");
    });
  }

  window.addEventListener("storage", function (event) {
    if (event.key === STORAGE_KEY || event.key === "ai-helpdesk-copilot-last-change") {
      refreshDashboard("Browser data updated");
    }
  });

  window.addEventListener("focus", function () {
    refreshDashboard();
  });

  refreshDashboard();
}());
