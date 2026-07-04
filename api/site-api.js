// Refactor Stage 2 API module: site-api.js
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
