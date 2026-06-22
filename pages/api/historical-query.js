import { getHistoricalRegistry } from "../../lib/historical/historicalResponseStore.js";
import { queryHistoricalArchive } from "../../lib/historical/historicalPullEngine.js";
export default function handler(req,res){
  try{
    const current={
      ticker:req.query.ticker||null,
      transitFamily:req.query.transitFamily||null,
      sectorId:req.query.sectorId||null,
      priorAstroState:req.query.priorAstroState||null,
      macroPressure:Number(req.query.macroPressure||0),
      macroExpansion:Number(req.query.macroExpansion||0),
      clusters:String(req.query.clusters||"").split(",").filter(Boolean)
    };
    const result=queryHistoricalArchive(current,getHistoricalRegistry(),{limit:Number(req.query.limit||12)});
    return res.status(200).json({success:true,route:"/api/historical-query",version:"v31-0-automated-historical-sector-resonance",current,...result});
  }catch(error){return res.status(500).json({success:false,error:error.message});}
}
