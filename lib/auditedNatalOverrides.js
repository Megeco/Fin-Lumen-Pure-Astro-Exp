const auditedNatalOverrides = {
  "DIXON.NS": {
    companyName: "Dixon Technologies (India) Limited",
    preferredChartId: "listing",
    auditStatus: "verified-multiple-anchors",
    charts: [
      {
        id: "incorporation",
        chartType: "incorporation",
        date: "1993-01-15",
        time: "11:00",
        city: "Alwar",
        country: "India",
        timezone: "Asia/Kolkata",
        confidence: "high",
        source: "SEBI prospectus: incorporated as Weston Utilities Limited at Alwar on 15 Jan 1993"
      },
      {
        id: "listing",
        chartType: "listing",
        date: "2017-09-18",
        time: "09:15",
        city: "Mumbai",
        country: "India",
        timezone: "Asia/Kolkata",
        confidence: "high",
        source: "NSE/company filing: shares listed on 18 Sep 2017"
      }
    ]
  },
  "BSE.NS": {
    preferredChartId: "listing",
    auditStatus: "validated-preferred-anchor",
    charts: [
      {
        id: "incorporation",
        chartType: "incorporation",
        date: "2005-08-08",
        time: "11:00",
        city: "Mumbai",
        country: "India",
        timezone: "Asia/Kolkata",
        confidence: "medium",
        source: "existing core registry; requires final source audit"
      },
      {
        id: "listing",
        chartType: "listing",
        date: "2017-02-03",
        time: "09:15",
        city: "Mumbai",
        country: "India",
        timezone: "Asia/Kolkata",
        confidence: "high",
        source: "validated project test anchor; exchange listing date"
      }
    ]
  },
  "JIOFIN.NS": {
    preferredChartId: "demerger-record-date",
    auditStatus: "validated-preferred-anchor",
    charts: [
      {
        id: "demerger-record-date",
        chartType: "record-date",
        date: "2023-07-20",
        time: "09:15",
        city: "Mumbai",
        country: "India",
        timezone: "Asia/Kolkata",
        confidence: "high",
        source: "validated project test anchor; Reliance demerger record date"
      },
      {
        id: "fresh-name-certificate",
        chartType: "scheme-effective",
        date: "2023-07-25",
        time: "11:00",
        city: "Mumbai",
        country: "India",
        timezone: "Asia/Kolkata",
        confidence: "high",
        source: "Jio Financial filing: fresh certificate/name change on 25 Jul 2023"
      },
      {
        id: "listing",
        chartType: "listing",
        date: "2023-08-21",
        time: "09:15",
        city: "Mumbai",
        country: "India",
        timezone: "Asia/Kolkata",
        confidence: "high",
        source: "Jio Financial filing: listed on BSE and NSE from 21 Aug 2023"
      }
    ]
  },
  "VEDL.NS": {
    preferredChartId: "incorporation",
    auditStatus: "restructured-entity",
    charts: [
      {
        id: "incorporation",
        chartType: "incorporation",
        date: "1965-06-25",
        time: "11:00",
        city: "Mumbai",
        country: "India",
        timezone: "Asia/Kolkata",
        confidence: "low",
        source: "existing registry anchor; requires primary-source verification"
      },
      {
        id: "demerger-effective-2026",
        chartType: "demerger-effective",
        date: "2026-05-01",
        time: "11:00",
        city: "Mumbai",
        country: "India",
        timezone: "Asia/Kolkata",
        confidence: "high",
        source: "Vedanta filing: scheme effective and record date 1 May 2026"
      }
    ]
  }
};

export default auditedNatalOverrides;
