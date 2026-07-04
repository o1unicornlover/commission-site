// Refactor Stage 2 API module: tos-api.js
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
