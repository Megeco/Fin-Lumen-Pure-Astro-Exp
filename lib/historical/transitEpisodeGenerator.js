import { generateRealTransits } from "../realTransitGenerator.js";
import calculateTransitResonance from "../transitResonance.js";
import { getRelevantEclipses, calculateRealEclipseHits } from "../realEclipseEngine.js";

const SLOW = new Set(["Jupiter","Saturn","Rahu","Ketu","Mars","Eclipse"]);
function key(c) { return `${c.planet}|${c.targetPlanet}|${c.aspect}`; }
function addDays(date, n) { const d = new Date(`${date}T00:00:00Z`); d.setUTCDate(d.getUTCDate()+n); return d.toISOString().slice(0,10); }

export function generateTransitEpisodes(natal, startDate, endDate, { stepDays = 3, maxOrb = 8 } = {}) {
  const active = new Map(); const episodes = [];
  for (let date = startDate; date <= endDate; date = addDays(date, stepDays)) {
    const transits = generateRealTransits(date);
    const eclipses = getRelevantEclipses(date, {daysBefore: 3, daysAfter: 3});
    const eclipseHits = calculateRealEclipseHits(natal,{referenceDate:date,daysBefore:3,daysAfter:3,eclipses,orbLimit:maxOrb});
    const replay = calculateTransitResonance(natal,{...transits,relevantEclipses:eclipses,eclipseHits});
    const contacts = (replay.transitDetails || []).filter(c => SLOW.has(c.planet) && Number(c.orb) <= maxOrb);
    const seen = new Set();
    for (const c of contacts) {
      const k = key(c); seen.add(k);
      if (!active.has(k)) active.set(k,{ key:k, planet:c.planet,targetPlanet:c.targetPlanet,aspect:c.aspect,orbEntry:date,exactHits:[],samples:[] });
      const ep = active.get(k); ep.samples.push({date,orb:Number(c.orb),score:Number(c.score)||0,transitSign:c.transitSign});
      if (Number(c.orb) <= Math.max(0.35, stepDays*0.12)) ep.exactHits.push(date);
    }
    for (const [k, ep] of [...active.entries()]) {
      if (!seen.has(k)) {
        const last = ep.samples[ep.samples.length-1];
        ep.orbExit = last?.date || date;
        ep.peak = ep.samples.slice().sort((a,b)=>a.orb-b.orb)[0] || null;
        ep.exactHits = [...new Set(ep.exactHits)];
        episodes.push(ep); active.delete(k);
      }
    }
  }
  for (const ep of active.values()) { ep.orbExit=endDate; ep.peak=ep.samples.slice().sort((a,b)=>a.orb-b.orb)[0]||null; ep.exactHits=[...new Set(ep.exactHits)]; episodes.push(ep); }
  return episodes;
}
