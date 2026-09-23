// Pricing is a public page with its own small entry point. It reads the same
// Supabase tables as the admin editor without depending on the full dashboard app.
(function initPublicPricing() {
  const grid = document.getElementById("pricingGrid");
  if (!grid) return;
  const viewer = document.getElementById("pricingImageDialog");
  const viewerImage = document.getElementById("pricingImageFull");
  const viewerTitle = document.getElementById("pricingImageTitle");
  let lastImageTrigger = null;

  viewer?.querySelector("[data-close-pricing-image]")?.addEventListener("click", () => viewer.close());
  viewer?.addEventListener("click", event => {
    if (event.target === viewer) viewer.close();
  });
  viewer?.addEventListener("close", () => {
    viewerImage.removeAttribute("src");
    lastImageTrigger?.focus();
  });

  function make(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text != null) element.textContent = String(text);
    return element;
  }

  async function render() {
    try {
      const [categoriesResult, itemsResult] = await Promise.all([
        supabaseClient.from("pricing_categories").select("*").order("sort_order").order("id"),
        supabaseClient.from("pricing_items").select("*").order("sort_order").order("id")
      ]);
      if (categoriesResult.error) throw categoriesResult.error;
      if (itemsResult.error) throw itemsResult.error;

      grid.replaceChildren();
      const items = itemsResult.data || [];
      const categories = (categoriesResult.data || []).filter(category =>
        items.some(item => String(item.category_id) === String(category.id))
      );
      if (!categories.length) {
        grid.append(make("p", "small", "No pricing info yet."));
        return;
      }

      categories.forEach((category, index) => {
        const groupItems = items.filter(item => String(item.category_id) === String(category.id));
        const section = make("details", "pricing-category");
        section.open = index === 0;
        const summary = make("summary");
        summary.append(make("span", "", category.name), make("small", "", `${groupItems.length} options`));
        section.append(summary);
        const list = make("div", "pricing-card-grid");

        groupItems.forEach(item => {
          const card = make("article", "price-example-card");
          if (item.image_url && /^https:\/\//i.test(item.image_url)) {
            const link = make("a", "price-example-thumb");
            link.href = item.image_url;
            link.rel = "noopener noreferrer";
            link.setAttribute("aria-label", `Open ${item.name} example image`);
            link.addEventListener("click", event => {
              if (!viewer?.showModal) return;
              event.preventDefault();
              lastImageTrigger = link;
              viewerImage.src = item.image_url;
              viewerImage.alt = `${item.name} example at full size`;
              viewerTitle.textContent = item.name;
              viewer.showModal();
            });
            const image = make("img");
            image.src = item.image_url;
            image.alt = `${item.name} example`;
            image.loading = "lazy";
            link.append(image);
            card.append(link);
          } else {
            const placeholder = make("div", "price-example-placeholder", "♡");
            placeholder.setAttribute("aria-hidden", "true");
            card.append(placeholder);
          }
          const body = make("div", "price-example-body");
          body.append(make("h3", "", item.name));
          if (item.description) body.append(make("p", "", item.description));
          body.append(make("strong", "price-example-amount", item.price || "Price TBA"));
          card.append(body);
          list.append(card);
        });
        section.append(list);
        grid.append(section);
      });
    } catch (error) {
      console.error("Could not load pricing:", error);
      const message = make("p", "small", "Pricing could not load. Please refresh the page.");
      message.setAttribute("role", "alert");
      grid.replaceChildren(message);
    } finally {
      grid.setAttribute("aria-busy", "false");
    }
  }

  render();
})();
