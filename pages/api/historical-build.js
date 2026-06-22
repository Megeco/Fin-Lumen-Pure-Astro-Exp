import { resolveCompany } from "../../lib/companyResolver.js";
import { buildHistoricalArchiveForCompany } from "../../lib/historical/buildHistoricalArchive.js";

export default async function handler(req,res){
  try{
    const ticker=String(req.query.ticker||req.body?.ticker||"").trim();
    const startDate=String(req.query.startDate||req.body?.startDate||"2015-01-01");
    const endDate=String(req.query.endDate||req.body?.endDate||new Date().toISOString().slice(0,10));
    const stepDays=Math.max(1,Math.min(14,Number(req.query.stepDays||req.body?.stepDays||3)));
    const fetchPrices=String(req.query.fetchPrices||req.body?.fetchPrices||"1")!=="0";
    if(!ticker)return res.status(400).json({success:false,error:"ticker is required"});
    const company=await resolveCompany(ticker);
    if(!company?.found)return res.status(404).json({success:false,error:"Company/natal chart not found",ticker});
    const archive=await buildHistoricalArchiveForCompany(company,{startDate,endDate,stepDays,fetchPrices});
    return res.status(200).json({success:true,route:"/api/historical-build",version:"v31-0-automated-historical-sector-resonance",...archive});
  }catch(error){return res.status(500).json({success:false,error:error.message,stack:error.stack});}
}
