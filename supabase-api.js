async function getSiteSettingsFromSupabase() {
  const { data, error } = await supabaseClient
    .from("site_settings")
    .select("*")
    .eq("id", 1)
    .single();

  if (error) {
    console.error("Error loading site settings:", error);
    return null;
  }

  return data;
}
