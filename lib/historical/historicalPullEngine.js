function jaccard(a=[],b=[]) { const A=new Set(a),B=new Set(b); const i=[...A].filter(x=>B.has(x)).length; const u=new Set([...A,...B]).size; return u?i/u:0; }
function norm(s){return String(s||"").toLowerCase();}
export function scoreHistoricalMatch(current={}, event={}) {
  let score=0;
  if (norm(current.ticker)===norm(event.ticker)) score+=35;
  if (current.transitFamily && current.transitFamily===event.transitFamily) score+=25;
  if (current.sectorId && current.sectorId===event.sectorId) score+=12;
  if (current.priorAstroState && current.priorAstroState===event.priorAstroState) score+=12;
  score += 10*jaccard(current.clusters,event.clusters);
  const pDiff=Math.abs((current.macroPressure||0)-(event.macroPressure||0));
  const eDiff=Math.abs((current.macroExpansion||0)-(event.macroExpansion||0));
  score += Math.max(0,6-(pDiff+eDiff)/20);
  return Math.round(score*10)/10;
}
export function queryHistoricalArchive(current, archive=[], {limit=12}={}) {
  const matches=archive.map(event=>({...event,matchScore:scoreHistoricalMatch(current,event)})).filter(x=>x.matchScore>=20).sort((a,b)=>b.matchScore-a.matchScore).slice(0,limit);
  const counts={}; for(const m of matches){const c=m.observedResponse?.classification||"unknown";counts[c]=(counts[c]||0)+1;}
  return {matches,evidenceCount:matches.length,responseDistribution:counts,confidence:matches.length>=8?"high":matches.length>=3?"moderate":"low",principle:"Historical response changes probabilities among astrologically possible expressions; it never overrides the current sky."};
}
