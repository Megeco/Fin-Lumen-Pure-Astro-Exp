import { createClient } from "@supabase/supabase-js";
import { astroEngine } from "../../lib/astroEngine";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {

  try {

    // ====================================
    // GET STOCKS
    // ====================================

    const { data: stocks, error } = await supabase
      .from("stocks")
      .select("*");

    if (error) {
      throw error;
    }

    // ====================================
    // LOOP STOCKS
    // ====================================

    for (const stock of stocks) {

      // ====================================
      // PURE ASTRO ENGINE
      // ====================================

      const astro = await astroEngine(stock);

      // ====================================
      // UPDATE DATA
      // ====================================

      const updateData = {

        structural_cycle: astro.structural_cycle,

        current_pressure: astro.current_pressure,

        next_pressure: astro.next_pressure,

        expansion_current: astro.expansion_current,

        next_ignition: astro.next_ignition,

        current_window: astro.current_window,

        action: astro.action,

        next_event: astro.next_event,

        days_to_event: astro.days_to_event,

        expected_behaviour: astro.expected_behaviour,

        updated_at: new Date().toISOString()

      };

      // ====================================
      // UPDATE STOCK
      // ====================================

      const { error: updateError } = await supabase
        .from("stocks")
        .update(updateData)
        .eq("id", stock.id);

      if (updateError) {
        console.log(updateError);
        throw updateError;
      }
    }

    // ====================================
    // SUCCESS
    // ====================================

    return res.status(200).json({
      success: true,
      updated: stocks.length
    });

  } catch (err) {

    console.log(err);

    return res.status(500).json({
      error: err.message
    });
  }
}
