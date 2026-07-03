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

async function getSlots() {
  const { data, error } = await supabaseClient
    .from("slots")
    .select("*")
    .order("sort_order");

  if (error) {
    console.error("Error loading slots:", error);
    return [];
  }

  return data;
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
