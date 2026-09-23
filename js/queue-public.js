(function initPublicQueue() {
  const grid = document.getElementById("queueGrid");
  if (!grid) return;
  const modal = document.getElementById("passwordModal");
  let selectedId = "";
  const text = value => String(value ?? "");
  function open(id) { selectedId = String(id); document.getElementById("clientPassword").value = ""; document.getElementById("passwordError").textContent = ""; modal?.classList.remove("hidden"); document.getElementById("clientPassword")?.focus(); }
  window.openPasswordModal = open;
  window.closeModal = () => modal?.classList.add("hidden");
  window.checkPassword = async () => { const entered = document.getElementById("clientPassword")?.value || ""; const { data } = await supabaseClient.from("commissions").select("id,password,client_access_code").eq("id", selectedId).single(); const allowed = data && entered && [data.password, data.client_access_code].filter(Boolean).includes(entered); if (!allowed) { document.getElementById("passwordError").textContent = "That code did not work. Check the message you received and try again."; return; } sessionStorage.setItem("progressAccess", JSON.stringify({ id: data.id, password: entered })); location.href = `progress.html?id=${encodeURIComponent(data.id)}`; };
  async function render() {
    try {
      const { data, error } = await supabaseClient.from("commissions").select("*").order("id", { ascending: false });
      if (error) throw error;
      const rows = (data || []).filter(c => String(c.status || "").toLowerCase() !== "archived" && String(c.request_status || "").toLowerCase() === "accepted" && !/^declined|request/i.test(String(c.status || "")));
      document.getElementById("queueCount").textContent = `${rows.length} active`;
      grid.replaceChildren();
      if (!rows.length) { grid.append(Object.assign(document.createElement("p"), { className: "small", textContent: "No active commissions yet." })); return; }
      rows.forEach(c => { const card = document.createElement("article"); card.className = "commission-card"; const image = c.preview_image_url ? Object.assign(document.createElement("img"), { className: "preview", src: c.preview_image_url, alt: `${c.display_name || "Client"} commission preview`, loading: "lazy" }) : Object.assign(document.createElement("div"), { className: "preview placeholder", textContent: "Private Preview" }); card.append(image); card.insertAdjacentHTML("beforeend", `<h3>${text(c.display_name || c.client_name || "Private Client").replace(/[&<>\"]/g, "")}</h3><p><strong>${text(c.commission_type || "Commission")}</strong></p><p class="small">Status: ${text(c.status || "In progress")}</p><button class="btn primary" type="button">Access Progress</button>`); card.querySelector("button").addEventListener("click", () => open(c.id)); grid.append(card); });
    } catch (error) { console.error(error); grid.innerHTML = `<p class="small" role="alert">The queue could not load. Please refresh.</p>`; }
    grid.setAttribute("aria-busy", "false");
  }
  modal?.addEventListener("click", event => { if (event.target === modal) window.closeModal(); });
  render();
})();
