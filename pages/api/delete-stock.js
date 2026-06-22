import { createClient } from "@supabase/supabase-js";
import { isBuiltInRegistrySymbol } from "../../lib/companyResolver.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  try {
    const { id } = req.body || {};

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Stock id required"
      });
    }

    let row = null;

    const { data: byId } = await supabase
      .from("stocks")
      .select("id,name,symbol")
      .eq("id", id)
      .maybeSingle();

    row = byId || null;

    const symbol = row?.name || row?.symbol || id;

    if (isBuiltInRegistrySymbol(symbol)) {
      return res.status(403).json({
        success: false,
        locked: true,
        error: "Core registry stock is locked. It can only be removed or changed in code."
      });
    }

    const { error } = await supabase
      .from("stocks")
      .delete()
      .eq("id", id);

    if (error) {
      throw error;
    }

    return res.status(200).json({
      success: true
    });
  } catch (err) {
    console.log(err);

    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}
