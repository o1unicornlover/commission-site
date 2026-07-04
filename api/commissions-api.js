// Refactor Stage 2 API module: commissions-api.js
// ---------- Supabase commissions ----------
async function getCommissions(options = {}) {
  let query = supabaseClient
    .from("commissions")
    .select("*")
    .order("id", { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error("Error loading commissions:", error);
    return [];
  }

  const rows = data || [];
  if (options.includeArchived) return rows;
  return rows.filter(c => String(c.status || "").toLowerCase() !== "archived");
}

async function getCommissionById(id) {
  const { data, error } = await supabaseClient
    .from("commissions")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error loading commission:", error);
    return null;
  }

  return data;
}

async function createCommission(values) {
  const payload = {
    client_name: values.client_name || values.display_name || "Anonymous",
    display_name: values.display_name || values.client_name || "Anonymous",
    commission_type: values.commission_type || "Commission",
    preview_image_url: values.preview_image_url || "",
    password: values.password || "",
    status: values.status || "Waiting / Not started",
    price: values.price || "",
    payment_status: values.payment_status || "Not requested",
    paypal_link: values.paypal_link || ""
  };

  const { data, error } = await supabaseClient
    .from("commissions")
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error("Error creating commission:", error);
    console.error("Commission payload was:", payload);
    return null;
  }

  return data;
}

async function updateCommission(id, values) {
  const { data, error } = await supabaseClient
    .from("commissions")
    .update(values)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating commission:", error);
    return null;
  }

  return data;
}

async function deleteCommission(id) {
  const { error } = await supabaseClient
    .from("commissions")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting commission:", error);
    return false;
  }

  return true;
}
