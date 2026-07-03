console.log("supabase-api.js loaded");

async function testSupabaseConnection() {
  const { data, error } = await supabaseClient
  .from("site_settings")
  .select("*")
  .limit(1)
  .single();
  
  if (error) {
    console.error("Supabase test failed:", error);
    return;
  }

  console.log("Supabase test worked:", data);
}

testSupabaseConnection();
