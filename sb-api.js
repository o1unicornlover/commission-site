// Supabase helper functions will go here.
// Connection is created in supabase-config.js.

async function getSiteSettings() {
  const { data, error } = await supabaseClient
    .from("site_settings")
    .select("*")
    .single();

  if (error) {
    console.error(error);
    return null;
  }

  return data;
}
