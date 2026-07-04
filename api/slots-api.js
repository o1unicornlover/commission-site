// Refactor Stage 2 API module: slots-api.js
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
