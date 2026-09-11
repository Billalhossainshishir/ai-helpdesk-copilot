const form = document.getElementById("ticketForm");
const submitButton = document.getElementById("submitButton");
const formAlert = document.getElementById("formAlert");
const description = document.getElementById("description");
const descriptionCount = document.getElementById("descriptionCount");
const serverStatus = document.getElementById("serverStatus");
const successModal = document.getElementById("successModal");
const newTicketButton = document.getElementById("newTicketButton");

const samples = {
  wifi: {
    device_type: "Windows laptop",
    title: "Wi-Fi keeps disconnecting",
    description: "My laptop disconnects from Wi-Fi every few minutes while I am working. Reconnecting works briefly, but the issue keeps returning."
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

function setServerStatus(state, message) {
  serverStatus.classList.remove("online", "offline");
  if (state) serverStatus.classList.add(state);
  serverStatus.querySelector("span:last-child").textContent = message;
}

async function checkHealth() {
  try {
    const response = await fetch("/health", { cache: "no-store" });
    if (!response.ok) throw new Error("Health check failed");
    const data = await response.json();
    if (data.status === "ok") {
      setServerStatus("online", "API online");
      return;
    }
    throw new Error("Unexpected health response");
  } catch (error) {
    setServerStatus("offline", "API unavailable");
  }
}

function updateDescriptionCount() {
  descriptionCount.textContent = `${description.value.length} / 5000`;
}

function clearValidation() {
  document.querySelectorAll(".field-error").forEach((el) => {
    el.textContent = "";
  });
  document.querySelectorAll(".invalid").forEach((el) => {
    el.classList.remove("invalid");
  });
  formAlert.hidden = true;
  formAlert.textContent = "";
}

function showFieldError(fieldName, message) {
  const field = form.elements[fieldName];
  const error = document.querySelector(`[data-error-for="${fieldName}"]`);
  if (field) field.classList.add("invalid");
  if (error) error.textContent = message;
}

function validateForm() {
  clearValidation();
  let valid = true;

  const name = form.elements.name.value.trim();
  const email = form.elements.email.value.trim();
  const title = form.elements.title.value.trim();
  const issueDescription = form.elements.description.value.trim();

  if (name.length < 2) {
    showFieldError("name", "Please enter at least 2 characters.");
    valid = false;
  }

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    showFieldError("email", "Please enter a valid email address.");
    valid = false;
  }

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

function setLoading(loading) {
  submitButton.disabled = loading;
  submitButton.classList.toggle("loading", loading);
}

function fillReceipt(ticket) {
  document.getElementById("receiptTicketNumber").textContent = ticket.ticket_number;
  document.getElementById("receiptStatus").textContent = ticket.status;
  document.getElementById("receiptCategory").textContent = ticket.category;
  document.getElementById("receiptPriority").textContent = ticket.priority;
}

function openSuccessModal(ticket) {
  fillReceipt(ticket);
  successModal.hidden = false;
  document.body.style.overflow = "hidden";
  newTicketButton.focus();
}

function closeSuccessModal() {
  successModal.hidden = true;
  document.body.style.overflow = "";
}

function humanizeApiError(data) {
  if (!data) return "The ticket could not be created. Please try again.";
  if (typeof data.detail === "string") return data.detail;

  if (Array.isArray(data.detail)) {
    return data.detail
      .map((item) => item.msg || "Validation error")
      .join(" ");
  }

  return "The ticket could not be created. Please check your details and try again.";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!validateForm()) return;

  setLoading(true);
  formAlert.hidden = true;

  const payload = {
    name: form.elements.name.value.trim(),
    email: form.elements.email.value.trim(),
    title: form.elements.title.value.trim(),
    description: form.elements.description.value.trim(),
    device_type: form.elements.device_type.value || null
  };

  try {
    const response = await fetch("/tickets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(humanizeApiError(data));
    }

    openSuccessModal(data);
    form.reset();
    updateDescriptionCount();
  } catch (error) {
    formAlert.textContent = error.message || "Unable to connect to the helpdesk API.";
    formAlert.hidden = false;
  } finally {
    setLoading(false);
  }
});

document.getElementById("sampleButtons").addEventListener("click", (event) => {
  const button = event.target.closest("[data-sample]");
  if (!button) return;

  const sample = samples[button.dataset.sample];
  if (!sample) return;

  form.elements.device_type.value = sample.device_type;
  form.elements.title.value = sample.title;
  form.elements.description.value = sample.description;
  updateDescriptionCount();
  clearValidation();
  form.elements.title.focus();
});

description.addEventListener("input", updateDescriptionCount);

newTicketButton.addEventListener("click", () => {
  closeSuccessModal();
  form.elements.name.focus();
});

successModal.addEventListener("click", (event) => {
  if (event.target === successModal) closeSuccessModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !successModal.hidden) {
    closeSuccessModal();
  }
});

updateDescriptionCount();
checkHealth();
