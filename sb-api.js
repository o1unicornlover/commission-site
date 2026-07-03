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
    .update({
      content,
      updated_at: new Date().toISOString()
    })
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

  const fileName = `${Date.now()}-${crypto.randomUUID()}-${safeName}`;

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
