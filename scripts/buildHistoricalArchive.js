import fs from "fs";
import path from "path";
import { resolveCompany } from "../lib/companyResolver.js";
import { buildHistoricalArchiveForCompany } from "../lib/historical/buildHistoricalArchive.js";
const [ticker,startDate="2015-01-01",endDate=new Date().toISOString().slice(0,10)] = process.argv.slice(2);
if(!ticker){console.error("Usage: node scripts/buildHistoricalArchive.js TICKER START END");process.exit(1);}
const company=await resolveCompany(ticker);
if(!company?.found)throw new Error(`Company not found: ${ticker}`);
const out=await buildHistoricalArchiveForCompany(company,{startDate,endDate,stepDays:3,fetchPrices:true});
const file=path.join(process.cwd(),"data",`historical-${ticker.replace(/[^a-z0-9]/gi,"_")}.json`);
fs.writeFileSync(file,JSON.stringify(out.records,null,2));
console.log(`Wrote ${out.records.length} events to ${file}`);
