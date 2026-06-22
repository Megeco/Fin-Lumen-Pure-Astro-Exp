import { computeAT } from "./astro";

export async function computeScores(stock) {
  const res = await fetch(
    `https://financialmodelingprep.com/api/v3/profile/${stock.name}?apikey=${process.env.FMP_API_KEY}`
  );

  const data = await res.json();
  const profile = data[0];

  const FS = profile ? 7 + Math.random() : 5;
  const CA = profile ? 7 : 5;
  const DZ = 5;

  const AT = await computeAT(stock.name);

  return { FS, CA, AT, DZ };
}
