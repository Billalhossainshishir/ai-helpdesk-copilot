(function () {
  "use strict";

  var STORAGE_KEY = "ai-helpdesk-copilot-demo-tickets";
  var form = document.getElementById("ticketForm");
  var submitButton = document.getElementById("submitButton");
  var analyseButton = document.getElementById("analyseButton");
  var formAlert = document.getElementById("formAlert");
  var description = document.getElementById("description");
  var descriptionCount = document.getElementById("descriptionCount");
  var successModal = document.getElementById("successModal");
  var newTicketButton = document.getElementById("newTicketButton");
  var latestAnalysis = null;

  var samples = {
    wifi: {
      device_type: "Windows laptop",
      title: "Wi-Fi keeps disconnecting",
      description: "My laptop disconnects from Wi-Fi every few minutes while I am working. Reconnecting works briefly, but the issue keeps returning and I cannot stay in video calls."
    },
    password: {
      device_type: "Windows laptop",
      title: "Cannot sign in after password reset",
      description: "I reset my account password today, but my laptop keeps saying the password is incorrect and I cannot sign in to my work account."
    },
    security: {
      device_type: "Windows laptop",
      title: "Suspicious email and sign-in alert",
      description: "I received a suspicious email asking me to verify my account, and shortly afterwards I received an unexpected sign-in alert from another location."
    },
    software: {
      device_type: "Windows laptop",
      title: "Application crashes when opening",
      description: "The application closes immediately every time I try to open it. I restarted the laptop, but the application still crashes on launch."
    }
  };

  var knowledge = {
    Network: [
      { title: "Intermittent Wi-Fi connection", solution: "Forget and reconnect to the wireless network, confirm signal strength, then test another network or access point to isolate whether the issue is device-specific.", similarity: 0.91 },
      { title: "VPN or network adapter instability", solution: "Disable and re-enable the network adapter, reconnect the VPN if used, and check whether the disconnect continues without the VPN.", similarity: 0.82 },
      { title: "Router and DNS connectivity checks", solution: "Restart the local router if appropriate, test another device, and compare IP/DNS connectivity to determine whether the issue is local or network-wide.", similarity: 0.73 }
    ],
    Hardware: [
      { title: "Peripheral or device hardware check", solution: "Power-cycle the device, disconnect non-essential peripherals, and test with a known-good cable or accessory where possible.", similarity: 0.88 },
      { title: "Battery, charging and power symptoms", solution: "Check the charger, power source and battery status. Record any LEDs, error messages or unusual heat before replacing components.", similarity: 0.79 },
      { title: "Printer and local device diagnostics", solution: "Check physical connections, device status, queued jobs and drivers, then test from another workstation if available.", similarity: 0.70 }
    ],
    Software: [
      { title: "Application crash on launch", solution: "Restart the application and device, check for updates, then review whether the problem started after a recent installation or configuration change.", similarity: 0.93 },
      { title: "Repair or reinstall application", solution: "Use the application's repair option when available. If the problem persists, preserve user data and reinstall using the approved package.", similarity: 0.84 },
      { title: "Compatibility and update review", solution: "Confirm the operating-system version, application version and recent updates, then test with a clean profile if appropriate.", similarity: 0.74 }
    ],
    Account: [
      { title: "Password reset sign-in issue", solution: "Confirm the correct username, wait for password synchronisation where applicable, then retry and verify that cached credentials are not being used.", similarity: 0.94 },
      { title: "Locked or inaccessible account", solution: "Check whether the account is locked or disabled, verify identity using the approved process, and restore access according to policy.", similarity: 0.85 },
      { title: "Multi-factor authentication access", solution: "Confirm the registered MFA method, device time and authenticator status before resetting MFA through the approved support process.", similarity: 0.72 }
    ],
    Email: [
      { title: "Outlook send or receive problem", solution: "Check network connectivity, mailbox status and client sync. Restart the client and compare with webmail to isolate the issue.", similarity: 0.90 },
      { title: "Mailbox storage or attachment issue", solution: "Check mailbox capacity and attachment size/type, then retry using webmail or a smaller approved attachment.", similarity: 0.80 },
      { title: "Email profile troubleshooting", solution: "Confirm account settings and, if necessary, create a fresh mail profile after preserving required local data.", similarity: 0.71 }
    ],
    Security: [
      { title: "Suspicious email or phishing report", solution: "Do not click further links or reply. Preserve the message, report it through the security process, and change credentials immediately if they may have been entered.", similarity: 0.96 },
      { title: "Unexpected sign-in alert", solution: "Review recent sign-ins, revoke suspicious sessions, change the password, verify MFA and escalate if compromise is suspected.", similarity: 0.90 },
      { title: "Possible malware or compromised device", solution: "Disconnect the device from the network if compromise is suspected and follow the approved security incident process before continuing normal use.", similarity: 0.83 }
    ],
    Other: [
      { title: "General IT issue triage", solution: "Record the exact error, affected device, time started and recent changes. Restart only when safe and note whether the problem is reproducible.", similarity: 0.72 },
      { title: "Collect diagnostic context", solution: "Capture screenshots or error codes, determine who else is affected and identify whether a workaround exists.", similarity: 0.65 },
      { title: "Escalation preparation", solution: "Document the steps already attempted and the business impact so the next support tier can continue without repeating work.", similarity: 0.59 }
    ]
  };

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

  function ensureTickets() {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seedTickets()));
      return seedTickets();
    }
    try {
      var parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch (error) {}
    var fresh = seedTickets();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    return fresh;
  }

  function updateDescriptionCount() {
    descriptionCount.textContent = description.value.length + " / 5000";
  }

  function clearValidation() {
    document.querySelectorAll(".field-error").forEach(function (el) { el.textContent = ""; });
    document.querySelectorAll(".invalid").forEach(function (el) { el.classList.remove("invalid"); });
    formAlert.hidden = true;
    formAlert.textContent = "";
  }

  function showFieldError(fieldName, message) {
    var field = form.elements[fieldName];
    var error = document.querySelector('[data-error-for="' + fieldName + '"]');
    if (field) field.classList.add("invalid");
    if (error) error.textContent = message;
  }

  function validateIssueOnly() {
    clearValidation();
    var valid = true;
    var title = form.elements.title.value.trim();
    var issueDescription = form.elements.description.value.trim();
    if (title.length < 3) {
      showFieldError("title", "Please enter at least 3 characters.");
      valid = false;
    }
    if (issueDescription.length < 10) {
      showFieldError("description", "Please describe the issue in at least 10 characters.");
      valid = false;
    }
    return valid;
  }

  function validateForm() {
    var valid = validateIssueOnly();
    var name = form.elements.name.value.trim();
    var email = form.elements.email.value.trim();
    if (name.length < 2) {
      showFieldError("name", "Please enter at least 2 characters.");
      valid = false;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      showFieldError("email", "Please enter a valid email address.");
      valid = false;
    }
    return valid;
  }

  function classify(text) {
    var lower = text.toLowerCase();
    var groups = {
      Security: ["phishing", "suspicious", "malware", "virus", "ransomware", "compromised", "breach", "hacked", "sign-in alert", "unknown login"],
      Network: ["wifi", "wi-fi", "internet", "network", "vpn", "disconnect", "router", "latency", "connection"],
      Account: ["password", "login", "log in", "sign in", "sign-in", "account locked", "locked out", "credentials", "mfa"],
      Email: ["outlook", "email", "mailbox", "mail ", "attachment", "send message", "receive message"],
      Hardware: ["keyboard", "screen", "battery", "printer", "charging", "monitor", "hard drive", "disk", "mouse", "hardware"],
      Software: ["application", "software", "crash", "error", "install", "update", "windows", "excel", "teams", "program"]
    };
    var best = "Other";
    var bestScore = 0;
    Object.keys(groups).forEach(function (category) {
      var score = 0;
      groups[category].forEach(function (term) {
        if (lower.indexOf(term) !== -1) score += 1;
      });
      if (score > bestScore) {
        best = category;
        bestScore = score;
      }
    });
    var confidence = bestScore === 0 ? 0.55 : Math.min(0.94, 0.60 + bestScore * 0.09);
    return { category: best, confidence: confidence };
  }

  function priorityFor(text, category) {
    var lower = text.toLowerCase();
    var reasons = [];
    var priority = "Medium";

    if (category === "Security" && /(compromised|breach|ransomware|malware|entered my password|unknown login)/.test(lower)) {
      priority = "Critical";
      reasons.push("Potential account or security compromise requires immediate review.");
    } else if (/(all users|company-wide|major outage|service down|cannot work|unable to work)/.test(lower)) {
      priority = "High";
      reasons.push("The wording indicates significant user or service impact.");
    } else if (category === "Security") {
      priority = "High";
      reasons.push("Security-related issues receive elevated priority for investigation.");
    } else if (/(disconnect|cannot sign in|locked out|crashes every time|not receiving)/.test(lower)) {
      priority = "High";
      reasons.push("The issue is repeatedly blocking an important task.");
    } else if (/(minor|cosmetic|question|how do i|request only)/.test(lower)) {
      priority = "Low";
      reasons.push("The description indicates limited immediate impact.");
    } else {
      reasons.push("No critical or high-impact trigger was detected in the demo rules.");
    }

    reasons.push("Priority is produced by transparent operational rules, not a hidden probability.");
    return { priority: priority, reasons: reasons };
  }

  function analysePayload() {
    var text = form.elements.title.value.trim() + " " + form.elements.description.value.trim();
    var prediction = classify(text);
    var priority = priorityFor(text, prediction.category);
    return {
      category: prediction.category,
      confidence: prediction.confidence,
      priority: priority.priority,
      priority_reasons: priority.reasons,
      suggestions: knowledge[prediction.category] || knowledge.Other
    };
  }

  function requesterContext() {
    var name = form.elements.name.value.trim();
    var email = form.elements.email.value.trim();
    var initials = "U";
    if (name) {
      initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(function (part) { return part.charAt(0).toUpperCase(); }).join("");
    }
    return { name: name || "Requester", email: email || "No email provided", initials: initials };
  }

  function renderRequesterChat(data) {
    var requester = requesterContext();
    document.getElementById("chatUserName").textContent = requester.name;
    document.getElementById("chatUserEmail").textContent = requester.email;
    document.getElementById("chatUserInitials").textContent = requester.initials;
    document.getElementById("chatUserMessage").textContent = form.elements.title.value.trim() + " — " + form.elements.description.value.trim();
    document.getElementById("chatBotMessage").textContent = "Hi " + requester.name + ". This browser demo classified your request as " + data.category + " with " + data.priority + " priority. The repository implementation performs this workflow through the FastAPI backend and trained scikit-learn classifier.";
  }

  function renderAnalysis(data) {
    latestAnalysis = data;
    renderRequesterChat(data);
    document.getElementById("analysisEmpty").hidden = true;
    document.getElementById("analysisResult").hidden = false;
    document.getElementById("analysisState").textContent = "Analysed";
    document.getElementById("analysisState").classList.add("ready");
    document.getElementById("analysisCategory").textContent = data.category;
    document.getElementById("analysisConfidence").textContent = Math.round(data.confidence * 100) + "% browser demo score · backend uses ML";
    document.getElementById("analysisPriority").textContent = data.priority;
    document.getElementById("priorityReasons").innerHTML = data.priority_reasons.map(function (reason) {
      return "<li>" + escapeHtml(reason) + "</li>";
    }).join("");
    document.getElementById("suggestionList").innerHTML = data.suggestions.map(function (article, index) {
      return '<article class="suggestion-card"><div class="suggestion-head"><span>' + (index + 1) + '</span><div><strong>' + escapeHtml(article.title) + '</strong><small>' + Math.round(article.similarity * 100) + '% demo similarity</small></div></div><p>' + escapeHtml(article.solution) + '</p></article>';
    }).join("");
  }

  function resetAnalysisState() {
    latestAnalysis = null;
    document.getElementById("analysisResult").hidden = true;
    document.getElementById("analysisEmpty").hidden = false;
    document.getElementById("analysisState").textContent = "Not analysed";
    document.getElementById("analysisState").classList.remove("ready");
  }

  function analyseIssue() {
    if (!validateIssueOnly()) return;
    analyseButton.disabled = true;
    document.getElementById("analysisState").textContent = "Analysing…";
    window.setTimeout(function () {
      renderAnalysis(analysePayload());
      analyseButton.disabled = false;
    }, 220);
  }

  function createTicket() {
    var tickets = ensureTickets();
    var analysis = latestAnalysis || analysePayload();
    var now = new Date();
    var ticket = {
      id: "user-" + now.getTime(),
      ticket_number: "HD-" + String(now.getTime()).slice(-6),
      name: form.elements.name.value.trim(),
      email: form.elements.email.value.trim(),
      title: form.elements.title.value.trim(),
      description: form.elements.description.value.trim(),
      device_type: form.elements.device_type.value || "Not specified",
      category: analysis.category,
      priority: analysis.priority,
      status: "Open",
      assigned_to: null,
      created_at: now.toISOString(),
      resolved_at: null,
      resolution: null,
      notes: []
    };
    tickets.unshift(ticket);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
    localStorage.setItem("ai-helpdesk-copilot-last-change", String(Date.now()));

    if ("BroadcastChannel" in window) {
      var channel = new BroadcastChannel("ai-helpdesk-copilot-demo");
      channel.postMessage({ type: "ticket-created", ticketId: ticket.id });
      channel.close();
    }
    return ticket;
  }

  analyseButton.addEventListener("click", analyseIssue);

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (!validateForm()) return;
    submitButton.disabled = true;
    var ticket = createTicket();
    document.getElementById("receiptRequester").textContent = ticket.name;
    document.getElementById("receiptEmail").textContent = ticket.email;
    document.getElementById("receiptTicketNumber").textContent = ticket.ticket_number;
    document.getElementById("receiptStatus").textContent = ticket.status;
    document.getElementById("receiptCategory").textContent = ticket.category;
    document.getElementById("receiptPriority").textContent = ticket.priority;
    successModal.hidden = false;
    document.body.style.overflow = "hidden";
    submitButton.disabled = false;
  });

  document.getElementById("sampleButtons").addEventListener("click", function (event) {
    var button = event.target.closest("[data-sample]");
    if (!button) return;
    var sample = samples[button.dataset.sample];
    if (!sample) return;
    form.elements.device_type.value = sample.device_type;
    form.elements.title.value = sample.title;
    form.elements.description.value = sample.description;
    updateDescriptionCount();
    clearValidation();
    resetAnalysisState();
  });

  description.addEventListener("input", function () {
    updateDescriptionCount();
    resetAnalysisState();
  });
  form.elements.title.addEventListener("input", resetAnalysisState);
  form.elements.device_type.addEventListener("change", resetAnalysisState);
  [form.elements.name, form.elements.email].forEach(function (field) {
    field.addEventListener("input", function () {
      if (latestAnalysis) renderRequesterChat(latestAnalysis);
    });
  });

  newTicketButton.addEventListener("click", function () {
    successModal.hidden = true;
    document.body.style.overflow = "";
    form.reset();
    resetAnalysisState();
    updateDescriptionCount();
    form.elements.name.focus();
  });

  successModal.addEventListener("click", function (event) {
    if (event.target === successModal) {
      successModal.hidden = true;
      document.body.style.overflow = "";
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !successModal.hidden) {
      successModal.hidden = true;
      document.body.style.overflow = "";
    }
  });

  ensureTickets();
  updateDescriptionCount();
}());
