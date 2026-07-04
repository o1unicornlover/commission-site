// Refactor Stage 2 API module: progress-api.js
async function getProgressUpdates(commissionId) {
  const { data, error } = await supabaseClient
    .from("progress_updates")
    .select("*")
    .eq("commission_id", commissionId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    console.error("Error loading progress updates:", error);
    return [];
  }

  return data || [];
}

async function createProgressUpdate(values) {
  const { data, error } = await supabaseClient
    .from("progress_updates")
    .insert([values])
    .select()
    .single();

  if (error) {
    console.error("Error creating progress update:", error);
    return null;
  }

  return data;
}

async function deleteProgressUpdate(id) {
  const { error } = await supabaseClient
    .from("progress_updates")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting progress update:", error);
    return false;
  }

  return true;
}
