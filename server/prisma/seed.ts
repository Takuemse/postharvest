import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Province, CropCategory, StorageCondition } from "../generated/prisma/client";

// sslmode in the URL would override the ssl option below, so strip it.
const dbUrl = new URL(process.env.DIRECT_URL!);
dbUrl.searchParams.delete("sslmode");

const adapter = new PrismaPg({
  connectionString: dbUrl.toString(),
  ssl: { rejectUnauthorized: false }, // dev seeding only
});

const prisma = new PrismaClient({ adapter });
// Towns and districts used for matching. A starting set: refine with real usage.
const LOCATIONS: Record<Province, string[]> = {
  HARARE: ["Harare", "Chitungwiza", "Epworth"],
  BULAWAYO: ["Bulawayo"],
  MANICALAND: ["Mutare", "Rusape", "Chipinge", "Nyanga", "Chimanimani", "Buhera", "Mutasa"],
  MASHONALAND_CENTRAL: ["Bindura", "Mazowe", "Shamva", "Guruve", "Mount Darwin", "Centenary"],
  MASHONALAND_EAST: ["Marondera", "Murewa", "Mutoko", "Goromonzi", "Mudzi", "Wedza", "Ruwa", "Chivhu"],
  MASHONALAND_WEST: ["Chinhoyi", "Kariba", "Kadoma", "Chegutu", "Norton", "Karoi", "Makonde"],
  MASVINGO: ["Masvingo", "Chiredzi", "Triangle", "Zaka", "Gutu", "Bikita", "Mwenezi"],
  MATABELELAND_NORTH: ["Hwange", "Victoria Falls", "Lupane", "Binga", "Tsholotsho"],
  MATABELELAND_SOUTH: ["Gwanda", "Beitbridge", "Plumtree", "Esigodini", "Filabusi"],
  MIDLANDS: ["Gweru", "Kwekwe", "Zvishavane", "Shurugwi", "Gokwe", "Redcliff", "Mvuma"],
};

// PLACEHOLDER shelf lives in days per storage condition (ambient / cool / refrigerated).
// Urgency is computed relative to these numbers, so validate them with an agronomist
// or experienced farmers before any real pilot. Admins will be able to edit them.
const CROPS: {
  name: string;
  category: CropCategory;
  days: [number, number, number];
}[] = [
  { name: "Tomatoes", category: "VEGETABLE", days: [5, 10, 14] },
  { name: "Leafy greens (rape, covo)", category: "VEGETABLE", days: [2, 4, 7] },
  { name: "Cabbage", category: "VEGETABLE", days: [7, 14, 28] },
  { name: "Green peppers", category: "VEGETABLE", days: [4, 7, 14] },
  { name: "Green beans", category: "VEGETABLE", days: [2, 5, 10] },
  { name: "Carrots", category: "ROOT_TUBER", days: [5, 14, 28] },
  { name: "Onions", category: "ROOT_TUBER", days: [30, 60, 120] },
  { name: "Potatoes", category: "ROOT_TUBER", days: [30, 60, 90] },
  { name: "Sweet potatoes", category: "ROOT_TUBER", days: [14, 30, 60] },
  { name: "Butternut", category: "VEGETABLE", days: [60, 90, 90] },
  { name: "Green maize", category: "GRAIN_LEGUME", days: [3, 5, 10] },
];

const STORAGE_ORDER: StorageCondition[] = ["AMBIENT", "COOL", "REFRIGERATED"];

async function main() {
  for (const [province, names] of Object.entries(LOCATIONS) as [Province, string[]][]) {
    for (const name of names) {
      await prisma.location.upsert({
        where: { province_name: { province, name } },
        update: {},
        create: { province, name },
      });
    }
  }

  for (const c of CROPS) {
    const crop = await prisma.crop.upsert({
      where: { name: c.name },
      update: { category: c.category },
      create: { name: c.name, category: c.category },
    });
    for (let i = 0; i < STORAGE_ORDER.length; i++) {
      await prisma.cropShelfLife.upsert({
        where: { cropId_storage: { cropId: crop.id, storage: STORAGE_ORDER[i] } },
        update: { days: c.days[i] },
        create: { cropId: crop.id, storage: STORAGE_ORDER[i], days: c.days[i] },
      });
    }
  }

  const [locations, crops, shelf] = await Promise.all([
    prisma.location.count(),
    prisma.crop.count(),
    prisma.cropShelfLife.count(),
  ]);
  console.log({ locations, crops, shelfLifeRows: shelf });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());