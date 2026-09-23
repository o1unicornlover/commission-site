(function initCommissionRequest() {
  const form = document.getElementById("commissionRequestForm");
  const status = document.getElementById("requestStatus");
  const choices = document.getElementById("commissionTypeChoices");
  const itemSelect = document.getElementById("pricingItemSelect");
  const addonBox = document.getElementById("addonChoices");
  const quote = document.getElementById("quotePreview");
  if (!form || !choices || typeof createCommission !== "function") return;
  let groups = [], baseGroup = null, addonGroup = null;
  const make = (tag, text, className) => { const el = document.createElement(tag); if (text != null) el.textContent = text; if (className) el.className = className; return el; };
  const numeric = value => { const match = String(value || "").replace(/,/g, "").match(/\d+(?:\.\d+)?/); return match ? Number(match[0]) : null; };
  function calculate() {
    const base = baseGroup?.items.find(item => String(item.id) === String(itemSelect.value));
    const addons = [...form.querySelectorAll('input[name="addon_item"]:checked')].map(input => addonGroup?.items.find(item => String(item.id) === String(input.value))).filter(Boolean);
    const baseValue = numeric(base?.price); let total = baseValue; let unknown = !base || baseValue == null;
    addons.forEach(item => { const raw = String(item.price || ""); const percent = raw.match(/(\d+)\s*%/); if (percent && total != null) total += total * Number(percent[1]) / 100; else if (/2\s*[×x]/i.test(raw) && total != null) total += baseValue || 0; else { const add = numeric(raw); if (add == null) unknown = true; else if (total != null) total += add; } });
    const quoteText = total != null && !unknown ? `$${Math.round(total)}` : (base?.price || "Quote after review");
    quote.querySelector("strong").textContent = `Estimated quote: ${quoteText}`;
    quote.querySelector("small").textContent = base ? "Add-ons are included in this estimate. I’ll confirm the final quote after reviewing your details." : "Choose a base option to see the starting price.";
    return { base, addons, quoteText };
  }
  function renderGroups() {
    choices.replaceChildren();
    groups.filter(group => !/add[- ]?ons?/i.test(group.name)).forEach(group => { const input = document.createElement("input"); input.type = "radio"; input.name = "commission_category"; input.id = `commissionCategory-${group.id}`; input.value = group.id; input.required = true; const label = make("label", null, "choice-card"); label.htmlFor = input.id; label.append(make("strong", group.name), make("small", `${group.items.length} option${group.items.length === 1 ? "" : "s"}`)); choices.append(input, label); input.addEventListener("change", () => { baseGroup = group; itemSelect.replaceChildren(make("option", "Choose an option")); group.items.forEach(item => { const option = make("option", `${item.name} — ${item.price || "Price TBA"}`); option.value = item.id; itemSelect.append(option); }); document.getElementById("pricingPick").hidden = false; calculate(); }); });
    addonGroup = groups.find(group => /add[- ]?ons?/i.test(group.name));
    if (!addonGroup?.items?.length) { addonBox.hidden = true; return; }
    addonBox.hidden = false; addonBox.replaceChildren(make("p", "Add-ons", "small"));
    addonGroup.items.forEach(item => { const label = make("label", null, "addon-choice"); const input = document.createElement("input"); input.type = "checkbox"; input.name = "addon_item"; input.value = item.id; input.addEventListener("change", calculate); label.append(input, make("span", `${item.name} — ${item.price || "quoted"}`)); addonBox.append(label); });
  }
  async function loadPricing() { const [categories, items] = await Promise.all([getPricingCategories(), getPricingItems()]); groups = categories.map(category => ({ ...category, items: items.filter(item => String(item.category_id) === String(category.id)) })).filter(group => group.items.length); if (!groups.length) choices.replaceChildren(make("p", "No commission options are available yet.", "small")); else renderGroups(); }
  itemSelect.addEventListener("change", calculate);
  form.addEventListener("submit", async event => { event.preventDefault(); if (!form.reportValidity()) return; const button = form.querySelector("button[type=submit]"); button.disabled = true; status.textContent = "Sending your request…"; const values = Object.fromEntries(new FormData(form).entries()); const estimate = calculate(); const selected = [estimate.base?.name, ...estimate.addons.map(item => item.name)].filter(Boolean).join(" + "); const created = await createCommission({ display_name: values.display_name, client_name: values.display_name, commission_type: `${baseGroup?.name || "Commission"} — ${estimate.base?.name || "Custom"}`, selected_pricing_item: selected, contact_platform: values.contact_platform, contact_username: values.contact_username, request_contact: `${values.contact_platform}: ${values.contact_username}`, request_details: values.request_details, reference_url: values.reference_url, quote_amount: estimate.quoteText, request_status: "pending", status: "Request — Pending", password: "", client_access_code: "" }); button.disabled = false; if (!created) { status.textContent = "I couldn’t save that request. Please try again in a moment."; return; } form.reset(); document.getElementById("pricingPick").hidden = true; addonBox.hidden = true; quote.querySelector("strong").textContent = "Estimated quote: —"; quote.querySelector("small").textContent = "Choose a base option to see the starting price."; status.textContent = `Request received! Keep request #${created.id}. I’ll contact you on ${values.contact_platform} after reviewing it.`; });
  loadPricing().catch(error => { console.error(error); choices.replaceChildren(make("p", "Pricing could not load. Please refresh and try again.", "small")); });
})();
