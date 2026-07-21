import customRegistry
from "./customRegistry.js";
import auditedNatalOverrides from "./auditedNatalOverrides.js";
import researchNatalCandidates from "./researchNatalCandidates.js";

const registry = {

  "AIAENG.NS": {
    companyName:
      "AIA Engineering Limited",

    incorporationDate:
      "1991-03-11",

    registeredOffice: {
      city:
        "Ahmedabad",

      country:
        "India",

      timezone:
        "Asia/Kolkata"
    },

    confidence:
      "high"
  },

  "TATAELXSI.NS": {
  companyName:
    "Tata Elxsi Limited",

  incorporationDate:
    "1989-03-30",

  registeredOffice: {
    city:
      "Bengaluru",

    country:
      "India",

    timezone:
      "Asia/Kolkata"
  },

  confidence:
    "high"
},

"SOLARINDS.NS": {
  companyName:
    "Solar Industries India Limited",

  incorporationDate:
    "1995-02-28",

  registeredOffice: {
    city:
      "Nagpur",

    country:
      "India",

    timezone:
      "Asia/Kolkata"
  },

  confidence:
    "high"
},

"DIXON.NS": {
  companyName:
    "Dixon Technologies (India) Limited",

  incorporationDate:
    "1993-01-02",

  registeredOffice: {
    city:
      "Noida",

    country:
      "India",

    timezone:
      "Asia/Kolkata"
  },

  confidence:
    "high"
},

"TECHNOE.NS": {
  companyName:
    "Techno Electric & Engineering Company Limited",

  incorporationDate:
    "2005-10-26",

  registeredOffice: {
    city:
      "Kolkata",

    country:
      "India",

    timezone:
      "Asia/Kolkata"
  },

  confidence:
    "medium"
},
  
  "WPIL.NS": {
  companyName:
    "WPIL Limited",

  incorporationDate:
    "1952-09-26",

  registeredOffice: {
    city:
      "Kolkata",

    country:
      "India",

    timezone:
      "Asia/Kolkata"
  },

  confidence:
    "medium"
},

"IDEA.NS": {
  companyName:
    "Vodafone Idea Limited",

  incorporationDate:
    "2018-08-31",

  registeredOffice: {
    city:
      "Mumbai",

    country:
      "India",

    timezone:
      "Asia/Kolkata"
  },

  confidence:
    "medium"
},
  
  "TCS.NS": {
    companyName:
      "Tata Consultancy Services Limited",

    incorporationDate:
      "1995-01-19",

    registeredOffice: {
      city:
        "Mumbai",

      country:
        "India",

      timezone:
        "Asia/Kolkata"
    },

    confidence:
      "high"
  },

  "ICICIBANK.NS": {
    companyName:
      "ICICI Bank Limited",

    incorporationDate:
      "1994-01-05",

    registeredOffice: {
      city:
        "Mumbai",

      country:
        "India",

      timezone:
        "Asia/Kolkata"
    },

    confidence:
      "high"
  },

  "SUZLON.NS": {
    companyName:
      "Suzlon Energy Ltd.",

    incorporationDate:
      "1995-04-10",

    registeredOffice: {
      city:
        "Ahmedabad",

      country:
        "India",

      timezone:
        "Asia/Kolkata"
    },

    confidence:
      "medium"
  },

  "BSE.NS": {
    companyName:
      "BSE Ltd.",

    incorporationDate:
      "2005-08-08",

    registeredOffice: {
      city:
        "Mumbai",

      country:
        "India",

      timezone:
        "Asia/Kolkata"
    },

    confidence:
      "medium"
  },

  "CDSL.NS": {
    companyName:
      "Central Depository Services (India) Ltd.",

    incorporationDate:
      "1997-12-12",

    registeredOffice: {
      city:
        "Mumbai",

      country:
        "India",

      timezone:
        "Asia/Kolkata"
    },

    confidence:
      "medium"
  },

  "PERSISTENT.NS": {
    companyName:
      "Persistent Systems Ltd.",

    incorporationDate:
      "1990-05-30",

    registeredOffice: {
      city:
        "Pune",

      country:
        "India",

      timezone:
        "Asia/Kolkata"
    },

    confidence:
      "medium"
  },

  "KPITTECH.NS": {
    companyName:
      "KPIT Technologies Ltd.",

    incorporationDate:
      "2018-01-08",

    registeredOffice: {
      city:
        "Pune",

      country:
        "India",

      timezone:
        "Asia/Kolkata"
    },

    confidence:
      "medium"
  },

  "TITAN.NS": {
    companyName:
      "Titan Company Ltd.",

    incorporationDate:
      "1984-07-26",

    registeredOffice: {
      city:
        "Bengaluru",

      country:
        "India",

      timezone:
        "Asia/Kolkata"
    },

    confidence:
      "high"
  },

  "TATAPOWER.NS": {
    companyName:
      "Tata Power Company Ltd.",

    incorporationDate:
      "1919-09-18",

    registeredOffice: {
      city:
        "Mumbai",

      country:
        "India",

      timezone:
        "Asia/Kolkata"
    },

    confidence:
      "high"
  },

  "MAZDOCK.NS": {
    companyName:
      "Mazagon Dock Shipbuilders Ltd.",

    incorporationDate:
      "1934-02-26",

    registeredOffice: {
      city:
        "Mumbai",

      country:
        "India",

      timezone:
        "Asia/Kolkata"
    },

    confidence:
      "medium"
  },

  "TRENT.NS": {
    companyName:
      "Trent Ltd.",

    incorporationDate:
      "1952-12-05",

    registeredOffice: {
      city:
        "Mumbai",

      country:
        "India",

      timezone:
        "Asia/Kolkata"
    },

    confidence:
      "medium"
  },

  "PFC.NS": {
    companyName:
      "Power Finance Corporation Ltd.",

    incorporationDate:
      "1986-07-16",

    birthTime:
      "11:00",

    chartType:
      "incorporation",

    registeredOffice: {
      city:
        "Delhi",

      country:
        "India",

      timezone:
        "Asia/Kolkata"
    },

    confidence:
  "medium"
},

  "PFC_NSE_LISTING_TEST": {
    companyName:
      "Power Finance Corporation Ltd. — NSE Listing Test",

    listingDate:
      "2007-02-23",

    birthTime:
      "09:15",

    chartType:
      "NSE listing",

    registeredOffice: {
      city:
        "Mumbai",

      country:
        "India",

      timezone:
        "Asia/Kolkata"
    },

    confidence:
      "test"
  },

"DIVISLAB.NS": {
  companyName:
    "Divi's Laboratories Limited",

  incorporationDate:
    "1990-10-12",

  registeredOffice: {
    city:
      "Hyderabad",

    country:
      "India",

    timezone:
      "Asia/Kolkata"
  },

  confidence:
    "high"
},

"RELIANCE.NS": {
  companyName:
    "Reliance Industries Limited",

  incorporationDate:
    "1973-05-08",

  registeredOffice: {
    city:
      "Mumbai",

    country:
      "India",

    timezone:
      "Asia/Kolkata"
  },

  confidence:
    "high"
},

"FORTIS.NS": {
  companyName:
    "Fortis Healthcare Limited",

  incorporationDate:
    "1996-02-28",

  registeredOffice: {
    city:
      "Gurugram",

    country:
      "India",

    timezone:
      "Asia/Kolkata"
  },

  confidence:
    "medium"
},

"PIIND.NS": {
  companyName:
    "PI Industries Limited",

  incorporationDate:
    "1946-12-31",

  registeredOffice: {
    city:
      "Udaipur",

    country:
      "India",

    timezone:
      "Asia/Kolkata"
  },

  confidence:
    "high"
},

"INFY.NS": {
  companyName:
    "Infosys Limited",

  incorporationDate:
    "1981-07-02",

  registeredOffice: {
    city:
      "Bengaluru",

      country:
      "India",

      timezone:
      "Asia/Kolkata"
  },

  confidence:
    "high"
},

"HDFCBANK.NS": {
  companyName:
    "HDFC Bank Limited",

  incorporationDate:
    "1994-08-30",

  registeredOffice: {
    city:
      "Mumbai",

    country:
      "India",

    timezone:
      "Asia/Kolkata"
  },

  confidence:
    "high"
},

"COCHINSHIP.NS": {
  companyName:
    "Cochin Shipyard Limited",

  incorporationDate:
    "1972-03-29",

  registeredOffice: {
    city:
      "Kochi",

    country:
      "India",

    timezone:
      "Asia/Kolkata"
  },

  confidence:
    "high"
},

"KAYNES.NS": {
  companyName:
    "Kaynes Technology India Limited",

  incorporationDate:
    "2008-03-28",

  registeredOffice: {
    city:
      "Mysuru",

    country:
      "India",

    timezone:
      "Asia/Kolkata"
  },

  confidence:
    "medium"
},

"NEWGEN.NS": {
  companyName:
    "Newgen Software Technologies Limited",

  incorporationDate:
    "1992-06-05",

  registeredOffice: {
    city:
      "New Delhi",

    country:
      "India",

    timezone:
      "Asia/Kolkata"
  },

  confidence:
    "medium"
},

"RECLTD.NS": {
  companyName:
    "REC Limited",

  incorporationDate:
    "1969-07-25",

  registeredOffice: {
    city:
      "New Delhi",

    country:
      "India",

    timezone:
      "Asia/Kolkata"
  },

  confidence:
    "high"
},

  "CUPID.NS": {
  companyName:
    "Cupid Limited",

  incorporationDate:
    "1993-02-16",

  registeredOffice: {
    city:
      "Mumbai",

    country:
      "India",

    timezone:
      "Asia/Kolkata"
  },

  confidence:
    "medium"
},
  
"SIEMENS.NS": {
  companyName:
    "Siemens Limited",

  incorporationDate:
    "1957-03-02",

  registeredOffice: {
    city:
      "Mumbai",

    country:
      "India",

    timezone:
      "Asia/Kolkata"
  },

  confidence:
    "high"
}
};

function legacyChart(entry = {}) {
  const chartType = entry.chartType || (entry.listingDate && !entry.incorporationDate ? "listing" : "incorporation");
  const isListing = String(chartType).toLowerCase().includes("listing");
  const office = entry.registeredOffice || {};
  const date = entry.birthDate || (isListing ? entry.listingDate : entry.incorporationDate) || entry.listingDate || entry.incorporationDate || null;
  if (!date) return null;
  return {
    id: entry.preferredChartId || chartType,
    chartType,
    date,
    time: entry.birthTime || (isListing ? "09:15" : "11:00"),
    city: entry.city || office.city || (isListing ? "Mumbai" : ""),
    country: entry.country || office.country || "India",
    timezone: entry.timezone || office.timezone || "Asia/Kolkata",
    confidence: entry.confidence || "low",
    source: entry.source || "legacy registry — source audit pending"
  };
}

function mergeCharts(...groups) {
  const map = new Map();
  for (const group of groups) {
    for (const chart of Array.isArray(group) ? group : []) {
      if (!chart?.date) continue;
      const key = chart.id || `${chart.chartType || "chart"}-${chart.date}`;
      map.set(key, { ...(map.get(key) || {}), ...chart, id: key });
    }
  }
  return [...map.values()];
}

function normalizeEntry(symbol, entry = {}) {
  const override = auditedNatalOverrides[symbol] || {};
  const research = researchNatalCandidates[symbol] || {};
  const baseCharts = Array.isArray(entry.charts) && entry.charts.length ? entry.charts : [legacyChart(entry)].filter(Boolean);
  const charts = mergeCharts(baseCharts, override.charts, research.charts);
  const preferredChartId = override.preferredChartId || research.preferredChartId || entry.preferredChartId || charts[0]?.id || null;
  const preferred = charts.find(c => c.id === preferredChartId) || charts[0] || null;
  return {
    ...entry,
    ...override,
    symbol,
    charts,
    preferredChartId: preferred?.id || preferredChartId,
    chartType: preferred?.chartType || entry.chartType || "incorporation",
    birthDate: preferred?.date || entry.birthDate || entry.incorporationDate || entry.listingDate || null,
    birthTime: preferred?.time || entry.birthTime || null,
    city: preferred?.city || entry.city || entry.registeredOffice?.city || "",
    country: preferred?.country || entry.country || entry.registeredOffice?.country || "India",
    timezone: preferred?.timezone || entry.timezone || entry.registeredOffice?.timezone || "Asia/Kolkata",
    source: preferred?.source || entry.source || "legacy registry — source audit pending",
    confidence: preferred?.confidence || entry.confidence || "low",
    auditStatus: override.auditStatus || entry.auditStatus || "pending-primary-source-audit",
    researchCase: research.researchCase || entry.researchCase || null,
    validationEligibility: research.validationEligibility || entry.validationEligibility || "included-research",
    researchNote: research.note || entry.researchNote || ""
  };
}

const rawMergedRegistry = { ...customRegistry, ...registry };
const mergedRegistry = Object.fromEntries(
  Object.entries(rawMergedRegistry).map(([symbol, entry]) => [symbol, normalizeEntry(symbol, entry)])
);

export default mergedRegistry;
