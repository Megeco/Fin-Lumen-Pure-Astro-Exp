import { buildHistoricalUniverseArchive } from "../lib/historical/buildHistoricalUniverseArchive.js";

const args = process.argv.slice(2);
const startDate = args[0] || "2015-01-01";
const endDate = args[1] || new Date().toISOString().slice(0,10);
const tickers = args[2] ? args[2].split(",").map(x => x.trim()).filter(Boolean) : null;
const fetchPrices = !args.includes("--no-prices");
const stepArg = args.find(x => x.startsWith("--step="));
const stepDays = stepArg ? Math.max(1, Number(stepArg.split("=")[1]) || 3) : 3;

const manifest = await buildHistoricalUniverseArchive({ startDate, endDate, tickers, fetchPrices, stepDays });
console.log(JSON.stringify({ success: true, ...manifest }, null, 2));
