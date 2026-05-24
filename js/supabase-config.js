const SUPABASE_URL = "COLE_AQUI_PROJECT_URL";
const SUPABASE_ANON_KEY = "COLE_AQUI_ANON_PUBLIC_KEY";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);
