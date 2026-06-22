import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

function inferDefaultProfile(
  ticker
) {
  const symbol =
    ticker.toUpperCase();

  // Finance
  if (
    symbol.includes(
      "BANK"
    ) ||
    symbol.includes(
      "FIN"
    )
  ) {
    return {
      structural_cycle:
        "STRUCTURAL LEADER",

      expected_behaviour:
        "Pressure likely absorbed",

      expansion_current:
        "EXPANDING",

      next_ignition:
        "9 Days"
    };
  }

  // Defence / industrial
  if (
    symbol.includes(
      "DEFENCE"
    ) ||
    symbol.includes(
      "AIA"
    ) ||
    symbol.includes(
      "ENG"
    )
  ) {
    return {
      structural_cycle:
        "SUPER CYCLE LEADER",

      expected_behaviour:
        "Pressure likely absorbed",

      expansion_current:
        "EXPANDING",

      next_ignition:
        "6 Days"
    };
  }

  // Default
  return {
    structural_cycle:
      "STRUCTURAL LEADER",

    expected_behaviour:
      "Temporary pressure phase",

    expansion_current:
      "COMPRESSING",

    next_ignition:
      "9 Days"
  };
}

export default async function handler(
  req,
  res
) {
  try {

    const { name } =
      req.body;

    if (!name) {
      return res
        .status(400)
        .json({
          error:
            "Stock name required"
        });
    }

    const ticker =
      name
        .toUpperCase()
        .trim();

    const profile =
      inferDefaultProfile(
        ticker
      );

    const stockData = {
      name:
        ticker,

      structural_cycle:
        profile
          .structural_cycle,

      current_pressure:
        "LOW",

      next_pressure:
        "Post-Crisis Stabilisation",

      expansion_current:
  profile
    .expansion_current,

      next_ignition:
        profile
          .next_ignition,

      current_window:
        `WAIT FOR ~${profile.next_ignition}`,

      action:
        "WATCH CLOSELY",

      next_event:
        "Post-Crisis Stabilisation",

      days_to_event:
        9,

      expected_behaviour:
        profile
          .expected_behaviour,

      updated_at:
        new Date()
          .toISOString()
    };

    const { error } =
      await supabase
        .from("stocks")
        .upsert(
          [stockData],
          {
            onConflict:
              "name"
          }
        );

    if (error) {
      throw error;
    }

    return res
      .status(200)
      .json({
        success:
          true
      });

  } catch (err) {

    console.log(
      err
    );

    return res
      .status(500)
      .json({
        error:
          err.message
      });
  }
}
