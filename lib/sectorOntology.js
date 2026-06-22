const SECTOR_DEFINITIONS = {
  pharma: {
    label: "Pharmaceuticals / life sciences",
    keywords: [/pharma/i, /drug/i, /life science/i, /biotech/i, /organic/i, /chemical/i, /health/i, /diagnostic/i],
    themes: ["healing", "restoration", "biological-growth", "research", "molecules"],
    planets: ["jupiter", "mercury", "venus", "moon"],
    signs: ["Cancer", "Virgo", "Pisces"]
  },
  hospitals: {
    label: "Hospitals / care infrastructure",
    keywords: [/hospital/i, /healthcare/i, /medical/i, /care/i],
    themes: ["care", "nurture", "protection", "public-welfare", "infrastructure"],
    planets: ["jupiter", "moon", "saturn"],
    signs: ["Cancer", "Virgo", "Pisces", "Capricorn"]
  },
  defence: {
    label: "Defence / weapons",
    keywords: [/defence/i, /defense/i, /missile/i, /weapon/i, /munition/i, /aerospace/i],
    themes: ["force", "security", "conflict", "deterrence", "engineering"],
    planets: ["mars", "saturn", "rahu"],
    signs: ["Aries", "Scorpio", "Capricorn"]
  },

  shipbuilding: {
    label: "Shipbuilding / defence shipyard",
    keywords: [/shipbuild/i, /shipyard/i, /dock/i, /naval/i, /warship/i, /submarine/i],
    themes: ["force", "security", "engineering", "public-capital", "capital-intensity", "order-book", "systems"],
    planets: ["mars", "saturn", "rahu", "jupiter"],
    signs: ["Aries", "Scorpio", "Capricorn", "Aquarius"]
  },
  realEstate: {
    label: "Real estate / housing",
    keywords: [/real estate/i, /housing/i, /developer/i, /property/i],
    themes: ["housing", "domestic-demand", "valuation", "capital", "stability"],
    planets: ["moon", "venus", "jupiter", "saturn"],
    signs: ["Cancer", "Taurus", "Capricorn"]
  },
  marketInfra: {
    label: "Market infrastructure / exchanges",
    keywords: [/exchange/i, /depository/i, /clearing/i, /registry/i, /mutual fund services/i, /capital market/i, /commodity exchange/i],
    themes: ["transactions", "market-participation", "information", "liquidity", "systems"],
    planets: ["mercury", "rahu", "jupiter", "saturn"],
    signs: ["Gemini", "Virgo", "Aquarius", "Sagittarius"]
  },
  electronicsManufacturing: {
    label: "Electronics manufacturing / industrial technology",
    keywords: [/electronics/i, /semiconductor/i, /ems/i, /manufactur/i, /industrial technology/i, /embedded/i],
    themes: ["execution", "capacity", "technology", "scale", "precision"],
    planets: ["mercury", "mars", "rahu", "saturn", "jupiter"],
    signs: ["Gemini", "Virgo", "Aries", "Capricorn", "Aquarius"]
  },
  metalsMining: {
    label: "Metals / mining",
    keywords: [/metal/i, /mining/i, /zinc/i, /aluminium/i, /steel/i, /copper/i, /ore/i],
    themes: ["resources", "extraction", "commodity-cycle", "industrial-demand", "capital-intensity"],
    planets: ["mars", "saturn", "venus", "rahu", "jupiter"],
    signs: ["Taurus", "Scorpio", "Capricorn", "Aries"]
  },
  finance: {
    label: "Finance / lending",
    keywords: [/finance/i, /bank/i, /lending/i, /credit/i, /loan/i, /nbfc/i],
    themes: ["capital", "credit", "valuation", "institutional-trust", "liquidity"],
    planets: ["jupiter", "venus", "mercury", "saturn"],
    signs: ["Taurus", "Libra", "Sagittarius", "Capricorn"]
  },
  infrastructure: {
    label: "Infrastructure / engineering",
    keywords: [/infrastructure/i, /engineering/i, /construction/i, /projects/i, /epc/i],
    themes: ["building", "execution", "public-capital", "durability", "scale"],
    planets: ["saturn", "mars", "jupiter"],
    signs: ["Capricorn", "Aries", "Sagittarius"]
  },
  consumer: {
    label: "Consumer / discretionary",
    keywords: [/consumer/i, /retail/i, /jewellery/i, /apparel/i, /fmcg/i, /brand/i],
    themes: ["preference", "desire", "consumption", "brand", "comfort"],
    planets: ["venus", "moon", "jupiter", "mercury"],
    signs: ["Taurus", "Libra", "Cancer", "Leo"]
  },
  energy: {
    label: "Energy / power",
    keywords: [/energy/i, /oil/i, /gas/i, /power/i, /electric/i, /renewable/i],
    themes: ["fuel", "power", "resources", "infrastructure", "transition"],
    planets: ["mars", "sun", "saturn", "rahu", "jupiter"],
    signs: ["Aries", "Leo", "Scorpio", "Capricorn"]
  }
};

function companyText(company = {}) {
  return [company.symbol, company.ticker, company.companyName, company.name, company.sector, company.industry, company.description, ...(company.tags || [])]
    .filter(Boolean).join(" | ");
}

export function inferSectorProfile(company = {}) {
  const text = companyText(company);
  const sectors = Object.entries(SECTOR_DEFINITIONS)
    .filter(([, def]) => def.keywords.some(rx => rx.test(text)))
    .map(([id, def]) => ({ id, ...def }));
  return {
    primary: sectors[0] || null,
    sectors,
    text,
    confidence: sectors.length ? (sectors.length === 1 ? "medium" : "high") : "low"
  };
}

export function getSectorDefinition(id) {
  return SECTOR_DEFINITIONS[id] || null;
}

export { SECTOR_DEFINITIONS };
