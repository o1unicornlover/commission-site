// Refactor Stage 2 API module: pricing-api.js
async function getPricingCategories() {
  const { data, error } = await supabaseClient
    .from("pricing_categories")
    .select("*")
    .order("sort_order")
    .order("id");

  if (error) {
    console.error("Error loading pricing categories:", error);
    return [];
  }

  return data || [];
}

async function getPricingItems() {
  const { data, error } = await supabaseClient
    .from("pricing_items")
    .select("*")
    .order("sort_order")
    .order("id");

  if (error) {
    console.error("Error loading pricing items:", error);
    return [];
  }

  return data || [];
}

async function getPricingGroups() {
  const categories = await getPricingCategories();
  const items = await getPricingItems();

  return categories.map(category => ({
    ...category,
    items: items.filter(item => String(item.category_id) === String(category.id))
  }));
}

async function createPricingCategory(values) {
  const { data, error } = await supabaseClient
    .from("pricing_categories")
    .insert([values])
    .select()
    .single();

  if (error) {
    console.error("Error creating pricing category:", error);
    return null;
  }

  return data;
}

async function removePricingCategory(id) {
  const { error } = await supabaseClient
    .from("pricing_categories")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting pricing category:", error);
    return false;
  }

  return true;
}

async function createPricingItem(values) {
  const { data, error } = await supabaseClient
    .from("pricing_items")
    .insert([values])
    .select()
    .single();

  if (error) {
    console.error("Error creating pricing item:", error);
    return null;
  }

  return data;
}

async function removePricingItem(id) {
  const { error } = await supabaseClient
    .from("pricing_items")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting pricing item:", error);
    return false;
  }

  return true;
}

async function updatePricingItem(id, values) {
  const { data, error } = await supabaseClient
    .from("pricing_items")
    .update(values)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating pricing item:", error);
    return null;
  }

  return data;
}
