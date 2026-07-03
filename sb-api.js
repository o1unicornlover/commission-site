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

async function getSocials() {
  const { data, error } = await supabaseClient
    .from("socials")
    .select("*")
    .eq("enabled", true)
    .order("sort_order");

  if (error) {
    console.error("Error loading socials:", error);
    return [];
  }

  return data;
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
