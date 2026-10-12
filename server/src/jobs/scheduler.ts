import { env } from "../config/env";
import { sweepHarvestAlerts } from "../services/alertService";

let running = false;

async function run() {
  if (running) return; // overlap guard: a slow sweep never stacks on itself
  running = true;
  try {
    const r = await sweepHarvestAlerts();
    console.log(`Sweep done: ${r.checked} harvests checked, ${r.sent} alerts sent`);
  } catch (e) {
    console.error("Sweep failed", e);
  } finally {
    running = false;
  }
}

// One sweep shortly after start, then on an interval. Move to a real scheduler at deployment;
// the alerts_sent table keeps several instances safe.
export function startSweeps() {
  setTimeout(run, 30_000);
  setInterval(run, env.SWEEP_INTERVAL_MINUTES * 60_000);
}