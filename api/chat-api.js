// Refactor Stage 2 API module: chat-api.js
// ---------- Supabase client messages ----------
async function getChatMessages(commissionId) {
  const { data, error } = await supabaseClient
    .from("chat_messages")
    .select("*")
    .eq("commission_id", String(commissionId))
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    console.error("Error loading chat messages:", error);
    return [];
  }

  return data || [];
}

async function createChatMessage(values) {
  const payload = {
    commission_id: String(values.commission_id),
    sender: values.sender || "client",
    message: values.message || ""
  };

  const { data, error } = await supabaseClient
    .from("chat_messages")
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error("Error sending chat message:", error);
    return null;
  }

  return data;
}

async function deleteChatMessage(id) {
  const { error } = await supabaseClient
    .from("chat_messages")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting chat message:", error);
    return false;
  }

  return true;
