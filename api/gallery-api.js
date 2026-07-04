// Refactor Stage 2 API module: gallery-api.js
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
