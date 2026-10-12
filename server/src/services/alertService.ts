import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { computeUrgency, todayInHarare } from "../utils/harvestStatus";
import { evaluateMatch } from "../utils/matching";
import { demandFacts, harvestFacts, harvestInclude } from "./matchingService";
import { notify } from "./notificationService";

// Keep transactions short: reads happen before, only the dedupe insert and the notification inside.
const TX = { maxWait: 10_000, timeout: 30_000 };

const fmtKg = (n: number) => `${n.toLocaleString("en-US", { maximumFractionDigits: 2 })} kg`;
const fmtDay = (d: Date) =>
  d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

type OpenDemand = Prisma.DemandGetPayload<{ include: { location: true } }>;

// The database decides "first time": createMany + skipDuplicates returns count 1 only for a new key.
// The notification is written in the same transaction, so a key can never exist without its alert.
async function sendOnce(key: string, send: (tx: Prisma.TransactionClient) => Promise<unknown>) {
  return prisma.$transaction(async (tx) => {
    const r = await tx.alertSent.createMany({ data: [{ key }], skipDuplicates: true });
    if (r.count !== 1) return false;
    await send(tx);
    return true;
  }, TX);
}

// Alert 1: a buyer just posted a request. Tell farmers whose harvest is a STRONG fit.
export async function alertFarmersForDemand(demandId: string) {
  const today = todayInHarare();
  const demand = await prisma.demand.findUnique({
    where: { id: demandId },
    include: { location: true, business: true, crop: true },
  });
  if (!demand || demand.status !== "OPEN" || demand.neededBy < today) return 0;

  const df = demandFacts(demand);
  if (df.remainingKg <= 0) return 0;

  const harvests = await prisma.harvest.findMany({
    where: { cropId: demand.cropId, status: "ACTIVE" },
    include: harvestInclude,
  });

  let sent = 0;
  for (const h of harvests) {
    const hf = harvestFacts(h);
    if (!hf) continue;
    const m = evaluateMatch(hf, df, today);
    if (!m.eligible || m.fit !== "STRONG") continue;

    const first = await sendOnce(`match:${h.id}:${demand.id}`, (tx) =>
      notify(tx, {
        profileId: h.farm.ownerId,
        type: "DEMAND_MATCH",
        harvestId: h.id,
        title: `${demand.business.name} needs ${fmtKg(df.remainingKg)} of ${demand.crop.name} in ${demand.location.name} by ${fmtDay(demand.neededBy)}`,
        body: `Your ${fmtKg(hf.availableKg)} is a strong fit. Open the harvest to offer it.`,
      }),
    );
    if (first) sent++;
  }
  return sent;
}

// Alert 2: a harvest is getting old (Sell soon or Sell now) and at least one open request fits it.
// Once per harvest, ever.
export async function sweepHarvestAlerts() {
  const today = todayInHarare();
  const harvests = await prisma.harvest.findMany({ where: { status: "ACTIVE" }, include: harvestInclude });
  const demandsByCrop = new Map<number, OpenDemand[]>();

  let checked = 0;
  let sent = 0;
  for (const h of harvests) {
    try {
      const hf = harvestFacts(h);
      if (!hf) continue;
      const { urgency } = computeUrgency({ harvestDate: h.harvestDate, shelfLifeDays: hf.shelfLifeDays, today });
      if (urgency === "SAFE") continue;
      checked++;

      const key = `sellsoon:${h.id}`;
      if (await prisma.alertSent.findUnique({ where: { key } })) continue; // cheap check; the insert below is the real guard

      let demands = demandsByCrop.get(h.cropId);
      if (!demands) {
        demands = await prisma.demand.findMany({
          where: { cropId: h.cropId, status: "OPEN", neededBy: { gte: today } },
          include: { location: true },
        });
        demandsByCrop.set(h.cropId, demands);
      }

      const fits = demands.filter((d) => {
        const df = demandFacts(d);
        return df.remainingKg > 0 && evaluateMatch(hf, df, today).eligible;
      }).length;
      if (fits === 0) continue;

      const first = await sendOnce(key, (tx) =>
        notify(tx, {
          profileId: h.farm.ownerId,
          type: "HARVEST_AT_RISK",
          harvestId: h.id,
          title: `Your ${fmtKg(hf.availableKg)} of ${h.crop.name} should sell soon, and ${fits} ${fits === 1 ? "request fits" : "requests fit"} it`,
          body: "Open the harvest to see who needs it.",
        }),
      );
      if (first) sent++;
    } catch (e) {
      console.error("Sweep skipped a harvest", h.id, e); // one bad harvest must not stop the rest
    }
  }
  return { checked, sent };
}