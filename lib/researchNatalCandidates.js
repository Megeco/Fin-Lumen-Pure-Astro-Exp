// v31.4 research-only natal chart candidates.
// These candidates are available in Replay Lab research mode but do not alter
// production scoring or the visible main stock table. Final preferred charts
// are promoted only after replay + JSON + price-chart validation.

const listing = (date, source = "NSE/BSE listing record or company filing — final source manifest pending") => ({
  id: "listing",
  chartType: "listing",
  date,
  time: "09:15",
  city: "Mumbai",
  country: "India",
  timezone: "Asia/Kolkata",
  confidence: "research-candidate",
  auditStatus: "research-candidate",
  source
});

const event = (id, chartType, date, city = "Mumbai", time = "09:15", source = "Official company/exchange event filing — research candidate") => ({
  id, chartType, date, time, city, country: "India", timezone: "Asia/Kolkata",
  confidence: "research-candidate", auditStatus: "research-candidate", source
});

const researchNatalCandidates = {
  "AARTIIND.NS": { charts: [listing("1995-02-08")] },
  "AIAENG.NS": { charts: [listing("2005-12-14")] },
  "ANANTRAJ.NS": { charts: [listing("2006-09-27"), event("listing-alternate-2006-01-17", "listing", "2006-01-17", "Mumbai", "09:15", "Pending company filing confirmation; retained only for research comparison")] },
  "DMART.NS": { charts: [listing("2017-03-21")] },
  "BSE.NS": { preferredChartId: "listing", charts: [listing("2017-02-03", "Validated project anchor; BSE/NSE listing date")] },
  "BAJAJFINANCE.NS": { charts: [listing("2003-04-01")] },
  "BAJAJFINSV.NS": { charts: [listing("2008-05-26")] },
  "BATAINDIA.NS": { charts: [listing("2003-06-17")] },
  "BDL.NS": { charts: [listing("2018-03-23")] },
  "BEL.NS": { charts: [listing("2000-07-19")] },
  "BHARTIARTL.NS": { charts: [listing("2002-02-15")] },
  "CGPOWER.NS": { charts: [listing("1995-02-28")] },
  "CARTRADE.NS": { charts: [listing("2021-08-20")] },
  "CDSL.NS": { charts: [listing("2017-06-30")] },
  "COALINDIA.NS": { charts: [event("coal-india-formation", "statutory-formation", "1975-11-01", "Kolkata", "15:00", "Official PSU formation date — research candidate"), listing("2010-11-04")] },
  "COCHINSHIP.NS": { charts: [listing("2017-08-11")] },
  "CUMMINSIND.NS": { charts: [listing("1995-03-29")] },
  "CUPID.NS": { charts: [listing("2016-09-16")] },
  "DATAPATTERNS.NS": { charts: [listing("2021-12-24")] },
  "DIVISLAB.NS": { charts: [listing("2003-03-12")] },
  "DIXON.NS": { preferredChartId: "listing", charts: [listing("2017-09-18", "NSE/company filing: listed 18 Sep 2017")] },
  "ETERNAL.NS": { preferredChartId: "name-change-eternal", charts: [listing("2021-07-23"), event("name-change-eternal", "name-change", "2025-03-20", "New Delhi", "11:00", "Company filing name-change anchor — promoted for post-2025 production after replay validation")] },
  "FORTIS.NS": { charts: [listing("2007-05-09")] },
  "GRWRHITECH.NS": { charts: [listing("1981-05-26"), event("name-change-2021", "name-change", "2021-04-20", "Aurangabad", "11:00"), event("listed-name-change-2022", "name-change", "2022-02-03", "Mumbai", "09:15")] },
  "GRAVITA.NS": { charts: [listing("2010-11-16")] },
  "HDFCBANK.NS": { charts: [listing("1995-11-08")] },
  "ICICIBANK.NS": { charts: [listing("1997-09-17")] },
  "IFCI.NS": { charts: [event("statutory-formation", "statutory-formation", "1948-07-01", "New Delhi", "11:00", "Statutory formation under IFC Act — research candidate")] },
  "IOC.NS": { charts: [event("present-ioc-formation", "merger-formation", "1964-09-01", "New Delhi", "11:00"), listing("1996-07-24")] },
  "INFY.NS": { charts: [listing("1995-02-08", "Verified NSE listing alternate; historic 1993 exchange listing remains unresolved")] },
  "JIOFIN.NS": { preferredChartId: "demerger-record-date", charts: [event("demerger-record-date", "record-date", "2023-07-20", "Mumbai", "09:15", "Validated project anchor; official demerger record date")] },
  "KEI.NS": { charts: [listing("2006-03-23")] },
  "KPITTECH.NS": { charts: [listing("2019-04-22"), event("demerger-effective", "demerger-effective", "2019-01-01", "Pune", "11:00", "Month-level scheme candidate; exact day must be verified before promotion")] },
  "KAYNES.NS": { charts: [listing("2022-11-22")] },
  "LT.NS": { charts: [] },
  "MAZDOCK.NS": { charts: [listing("2020-10-12")] },
  "MCX.NS": { charts: [listing("2012-03-09")] },
  "NHPC.NS": { charts: [listing("2009-09-01")] },
  "NMDC.NS": { charts: [listing("2008-03-03")] },
  "NTPC.NS": { charts: [listing("2004-11-05"), event("name-change-2005", "name-change", "2005-10-28", "New Delhi", "11:00")] },
  "NETWEB.NS": { charts: [listing("2023-07-27")] },
  "NEWGEN.NS": { charts: [listing("2018-01-29")] },
  "PCJEWELLER.NS": { charts: [listing("2012-12-27")] },
  "PGEL.NS": { charts: [listing("2011-09-26")] },
  "PERSISTENT.NS": { charts: [listing("2010-04-06")] },
  "PFC.NS": { charts: [listing("2007-02-23")] },
  "RECLTD.NS": { charts: [listing("2008-03-12")] },
  "RELIANCE.NS": { charts: [listing("1995-11-29")] },
  "SBIN.NS": { charts: [event("statutory-formation", "statutory-formation", "1955-07-01", "Mumbai", "11:00", "Statutory formation under SBI Act"), listing("1995-03-01")] },
  "SIEMENS.NS": { charts: [listing("1995-09-06")] },
  "SJVN.NS": { charts: [listing("2010-05-20")] },
  "SKIPPER.NS": { charts: [listing("2015-05-27")] },
  "SOLARINDS.NS": { charts: [listing("2006-04-03")] },
  "SUZLON.NS": { charts: [listing("2005-10-19")] },
  "TCS.NS": { charts: [listing("2004-08-25")] },
  "TRENT.NS": { charts: [listing("2004-06-07")] },
  "VEDL.NS": { charts: [listing("1998-05-13"), event("demerger-effective-2026", "demerger-effective", "2026-05-01", "Mumbai", "09:15", "Official Vedanta scheme effective/record date; structural-event chart only")] },
  "WPIL.NS": {
    researchCase: "cascading-break",
    validationEligibility: "included-research",
    charts: [],
    note: "Retained specifically to learn cascading-fall and break-signature behaviour; not excluded from natal or historical research."
  }
};

export default researchNatalCandidates;
