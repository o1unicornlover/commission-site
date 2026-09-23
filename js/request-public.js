(function initCommissionRequest() {
  const form = document.getElementById("commissionRequestForm");
  const status = document.getElementById("requestStatus");
  if (!form || typeof createCommission !== "function") return;
  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const button = form.querySelector("button[type=submit]");
    button.disabled = true;
    status.textContent = "Sending your request…";
    const values = Object.fromEntries(new FormData(form).entries());
    const created = await createCommission({
      display_name: values.display_name,
      client_name: values.display_name,
      commission_type: values.commission_type,
      request_contact: values.request_contact,
      request_details: values.request_details,
      reference_url: values.reference_url,
      requested_budget: values.requested_budget,
      request_status: "pending",
      status: "Request — Pending",
      password: "",
      client_access_code: ""
    });
    button.disabled = false;
    if (!created) {
      status.textContent = "I couldn’t save that request. Please try again in a moment.";
      return;
    }
    form.reset();
    status.textContent = `Request received! Keep this request number: #${created.id}. I’ll contact you after reviewing it.`;
  });
})();
