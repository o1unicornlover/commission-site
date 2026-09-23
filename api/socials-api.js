// Refactor Stage 2 API module: socials-api.js
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

async function updateSocial(id, values) {
  const { data, error } = await supabaseClient
    .from("socials")
    .update(values)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating social contact:", error);
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
