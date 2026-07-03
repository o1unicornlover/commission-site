async function getSiteSettings() {
  const { data, error } = await supabaseClient
    .from("site_settings")
    .select("*")
    .limit(1)
    .single();

  if (error) {
    console.error("Error loading site settings:", error);
    return null;
  }

  return data;
}

async function updateSiteSettings(values) {
  const existing = await getSiteSettings();

  if (!existing || !existing.id) {
    console.error("Could not update site settings because no settings row was found.");
    return null;
  }

  const { data, error } = await supabaseClient
    .from("site_settings")
    .update(values)
    .eq("id", existing.id)
    .select()
    .single();

  if (error) {
    console.error("Error updating site settings:", error);
    return null;
  }

  return data;
}

async function getSlots() {
  const { data, error } = await supabaseClient
    .from("slots")
    .select("*")
    .order("sort_order")
    .order("id");

  if (error) {
    console.error("Error loading slots:", error);
    return [];
  }

  return data || [];
}

async function updateSlot(id, values) {
  const { data, error } = await supabaseClient
    .from("slots")
    .update(values)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating slot:", error);
    return null;
  }

  return data;
}

async function getSocials() {
  const { data, error } = await supabaseClient
    .from("socials")
    .select("*")
    .eq("enabled", true)
    .order("sort_order")
    .order("id");

  if (error) {
    console.error("Error loading socials:", error);
    return [];
  }

  return data || [];
}

async function addSocial(values) {
  const { data, error } = await supabaseClient
    .from("socials")
    .insert([values])
    .select()
    .single();

  if (error) {
    console.error("Error adding social:", error);
    return null;
  }

  return data;
}

async function deleteSocial(id) {
  const { error } = await supabaseClient
    .from("socials")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting social:", error);
    return false;
  }

  return true;
}

async function getGalleryItems(options = {}) {
  let query = supabaseClient
    .from("gallery")
    .select("*")
    .order("sort_order")
    .order("id");

  if (options.featuredOnly) query = query.eq("featured", true);
  if (options.limit) query = query.limit(options.limit);

  const { data, error } = await query;

  if (error) {
    console.error("Error loading gallery:", error);
    return [];
  }

  return data || [];
}

async function addGalleryImage(values) {
  const { data, error } = await supabaseClient
    .from("gallery")
    .insert([values])
    .select()
    .single();

  if (error) {
    console.error("Error adding gallery image:", error);
    return null;
  }

  return data;
}

async function deleteGalleryImage(id) {
  const { error } = await supabaseClient
    .from("gallery")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting gallery image:", error);
    return false;
  }

  return true;
}

async function getTos() {
  const { data, error } = await supabaseClient
    .from("tos")
    .select("*")
    .limit(1)
    .single();

  if (error) {
    console.error("Error loading TOS:", error);
    return null;
  }

  return data;
}

async function updateTos(content) {
  const existing = await getTos();
  if (!existing) return null;

  const { data, error } = await supabaseClient
    .from("tos")
    .update({ content, updated_at: new Date().toISOString() })
    .eq("id", existing.id)
    .select()
    .single();

  if (error) {
    console.error("Error updating TOS:", error);
    return null;
  }

  return data;
}

async function uploadImage(file, bucket) {
  if (!file) return null;

  const safeName = file.name
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-");

  const randomPart = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(16).slice(2);
  const fileName = `${Date.now()}-${randomPart}-${safeName}`;

  const { error } = await supabaseClient.storage
    .from(bucket)
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false
    });

  if (error) {
    console.error("Upload error:", error);
    return null;
  }

  const { data } = supabaseClient.storage
    .from(bucket)
    .getPublicUrl(fileName);

  return data.publicUrl;
}

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

// ---------- Supabase commissions ----------
async function getCommissions(options = {}) {
  let query = supabaseClient
    .from("commissions")
    .select("*")
    .order("id", { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error("Error loading commissions:", error);
    return [];
  }

  const rows = data || [];
  if (options.includeArchived) return rows;
  return rows.filter(c => String(c.status || "").toLowerCase() !== "archived");
}

async function getCommissionById(id) {
  const { data, error } = await supabaseClient
    .from("commissions")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error loading commission:", error);
    return null;
  }

  return data;
}

async function createCommission(values) {
  const { data, error } = await supabaseClient
    .from("commissions")
    .insert([values])
    .select()
    .single();

  if (error) {
    console.error("Error creating commission:", error);
    return null;
  }

  return data;
}

async function updateCommission(id, values) {
  const { data, error } = await supabaseClient
    .from("commissions")
    .update(values)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating commission:", error);
    return null;
  }

  return data;
}

async function deleteCommission(id) {
  const { error } = await supabaseClient
    .from("commissions")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting commission:", error);
    return false;
  }

  return true;
}

async function getProgressUpdates(commissionId) {
  const { data, error } = await supabaseClient
    .from("progress_updates")
    .select("*")
    .eq("commission_id", commissionId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    console.error("Error loading progress updates:", error);
    return [];
  }

  return data || [];
}

async function createProgressUpdate(values) {
  const { data, error } = await supabaseClient
    .from("progress_updates")
    .insert([values])
    .select()
    .single();

  if (error) {
    console.error("Error creating progress update:", error);
    return null;
  }

  return data;
}

async function deleteProgressUpdate(id) {
  const { error } = await supabaseClient
    .from("progress_updates")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting progress update:", error);
    return false;
  }

  return true;
}
