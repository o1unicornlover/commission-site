const SUPABASE_URL = "https://gqqssyqswyualglleedm.supabase.co";
const SUPABASE_KEY = "sb_publishable_KaDiqAVR0_IdIuXW4mFyGg_8EHt2NWf";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Some modular runtime helpers intentionally feature-detect the shared client
// through window. Keep the lexical binding above for legacy modules and expose
// the same client instance for realtime/reconnect helpers.
window.supabaseClient = supabaseClient;
