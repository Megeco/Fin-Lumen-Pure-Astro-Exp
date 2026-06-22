import { inferSectorProfile } from "./sectorOntology.js";

const SIGN_THEMES = {
  Aries: ["force", "initiative", "execution", "conflict"],
  Taurus: ["resources", "valuation", "materials", "stability", "consumption"],
  Gemini: ["information", "transactions", "communication", "technology"],
  Cancer: ["nurture", "care", "healing", "protection", "food", "housing", "public-welfare"],
  Leo: ["leadership", "visibility", "power", "brands"],
  Virgo: ["health", "analysis", "process", "precision", "services"],
  Libra: ["valuation", "preference", "partnership", "markets"],
  Scorpio: ["resources", "risk", "transformation", "defence", "depth"],
  Sagittarius: ["expansion", "institutions", "knowledge", "globalisation"],
  Capricorn: ["structure", "infrastructure", "discipline", "capital-intensity"],
  Aquarius: ["technology", "networks", "systems", "collective-infrastructure"],
  Pisces: ["healing", "dissolution", "care", "chemistry", "imagination"]
};

function overlap(a = [], b = []) { return a.filter(x => b.includes(x)); }

export function buildMacroThemeContext(company, ephemeris = {}, replay = null) {
  const sectorProfile = inferSectorProfile(company);
  const jupiterSign = ephemeris?.transits?.positions?.jupiter?.sign || ephemeris?.transits?.jupiter?.sign || null;
  const signThemes = SIGN_THEMES[jupiterSign] || [];
  const sectorMatches = sectorProfile.sectors.map(sector => {
    const themeMatches = overlap(signThemes, sector.themes);
    const natalContacts = replay?.transitDetails || [];
    const relevantNatal = natalContacts.filter(c => sector.planets.includes(String(c.planet || "").toLowerCase()) || sector.planets.includes(String(c.targetPlanet || "").toLowerCase()));
    const exactNatal = relevantNatal.filter(c => Number(c.orb) <= 1.5);
    const hardNatal = relevantNatal.filter(c => ["square", "opposition"].includes(c.aspect) && Number(c.score) < 0);
    const thematicScore = Math.min(30, themeMatches.length * 8);
    const natalActivationScore = Math.min(55, exactNatal.reduce((s, c) => s + Math.min(15, Math.abs(Number(c.score) || 0)), 0));
    const conflictPenalty = Math.min(35, hardNatal.reduce((s, c) => s + Math.min(12, Math.abs(Number(c.score) || 0)), 0));
    return {
      sectorId: sector.id,
      sectorLabel: sector.label,
      jupiterSign,
      signThemes,
      themeMatches,
      relevantPlanets: sector.planets,
      thematicCompatibility: thematicScore,
      natalActivation: natalActivationScore,
      conflictPenalty,
      netResonance: Math.max(-50, Math.min(100, thematicScore + natalActivationScore - conflictPenalty)),
      exactNatalContacts: exactNatal.slice(0, 6),
      hardNatalContacts: hardNatal.slice(0, 6),
      principle: "Sector resonance amplifies a real natal activation; it never creates a signal by itself."
    };
  });
  return {
    jupiterSign,
    signThemes,
    sectorProfile,
    matches: sectorMatches.sort((a,b) => b.netResonance - a.netResonance),
    primary: sectorMatches.sort((a,b) => b.netResonance - a.netResonance)[0] || null
  };
}
