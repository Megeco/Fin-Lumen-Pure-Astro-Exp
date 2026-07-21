import { createClient } from "@supabase/supabase-js";

let cachedClient = null;

function getSupabaseClient() {
  const url = String(
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_PROJECT_URL ||
    ""
  ).trim().replace(/\/+$/, "");

  const key = String(
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ""
  ).trim();

  if (!url || !key || !/^https?:\/\//i.test(url)) {
    throw new Error("Supabase environment variables are not configured or URL is invalid");
  }

  if (!cachedClient) {
    cachedClient = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }

  return cachedClient;
}

export const db = {
  getAll: async () => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from("stocks").select("*");

    if (error) {
      throw error;
    }

    return data || [];
  },

  get: async (name) => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("stocks")
      .select("*")
      .eq("name", name)
      .single();

    if (error) {
      throw error;
    }

    return data;
  },

  upsert: async (row) => {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from("stocks").upsert(row);

    if (error) {
      throw error;
    }
  }
};

export default db;
