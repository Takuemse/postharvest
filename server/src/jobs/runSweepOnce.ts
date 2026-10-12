import { prisma } from "../lib/prisma";
import { sweepHarvestAlerts } from "../services/alertService";

sweepHarvestAlerts()
  .then((r) => console.log(`Sweep done: ${r.checked} harvests checked, ${r.sent} alerts sent`))
  .catch((e) => {
    console.error("Sweep failed", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit();
  });