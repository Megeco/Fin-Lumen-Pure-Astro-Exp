export function run2027CycleEngine(stock) {

  // ========================================
  // SUPER CYCLE LEADERS
  // ========================================

  const superCycle = [

    "KAYNES.NS",
    "MAZDOCK.NS",
    "KPIT.NS",
    "NEWGEN.NS",
    "BSE.NS",
    "BDL.NS",
    "PFC.NS",
    "RECLTD.NS",
    "CGPOWER.NS",
    "DATAPATTNS.NS",
    "PCJEWELLER.NS",
    "EPACK.NS"

  ];

  // ========================================
  // STRUCTURAL LEADERS
  // ========================================

  const structural = [

    "LT.NS",
    "FORTIS.NS",
    "COCHINSHIP.NS",
    "TITAGARH.NS",
    "CUMMINSIND.NS",
    "SIEMENS.NS",
    "TATAPOWER.NS",
    "IRFC.NS",
    "CDSL.NS",
    "LUPIN.NS"

  ];

  // ========================================
  // ROTATIONAL
  // ========================================

  const rotational = [

    "SUZLON.NS",
    "IDEA.NS",
    "JMFINANCIL.NS",
    "TDPOWERSYS.NS"

  ];

  // ========================================
  // DISTRIBUTE
  // ========================================

  const distribute = [

    "TRENT.NS",
    "RECLTD.NS"

  ];

  // ========================================
  // CLASSIFICATION
  // ========================================

  let cycle_2027 = "EXIT CYCLE";

  if (superCycle.includes(stock)) {
    cycle_2027 = "SUPER CYCLE LEADER";
  }

  else if (structural.includes(stock)) {
    cycle_2027 = "STRUCTURAL LEADER";
  }

  else if (rotational.includes(stock)) {
    cycle_2027 = "ROTATIONAL";
  }

  else if (distribute.includes(stock)) {
    cycle_2027 = "DISTRIBUTE";
  }

  return {
    cycle_2027
  };
}
