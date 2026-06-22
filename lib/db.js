import { createClient } from "@supabase/supabase-js";

let cachedClient = null;

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;

  if (!url || !key) {
    throw new Error("Supabase environment variables are not configured");
  }

  if (!cachedClient) {
    cachedClient = createClient(url, key);
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
