-- CreateEnum
CREATE TYPE "Role" AS ENUM ('FARMER', 'BUYER', 'ADMIN');

-- CreateEnum
CREATE TYPE "Province" AS ENUM ('BULAWAYO', 'HARARE', 'MANICALAND', 'MASHONALAND_CENTRAL', 'MASHONALAND_EAST', 'MASHONALAND_WEST', 'MASVINGO', 'MATABELELAND_NORTH', 'MATABELELAND_SOUTH', 'MIDLANDS');

-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('RESTAURANT', 'RETAILER', 'WHOLESALER', 'MARKET_VENDOR', 'PROCESSOR', 'OTHER');

-- CreateEnum
CREATE TYPE "CropCategory" AS ENUM ('VEGETABLE', 'FRUIT', 'ROOT_TUBER', 'GRAIN_LEGUME');

-- CreateEnum
CREATE TYPE "StorageCondition" AS ENUM ('AMBIENT', 'COOL', 'REFRIGERATED');

-- CreateEnum
CREATE TYPE "HarvestStatus" AS ENUM ('ACTIVE', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "DemandStatus" AS ENUM ('OPEN', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('REQUESTED', 'CONFIRMED', 'READY', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('USD', 'ZWG');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ORDER_REQUESTED', 'ORDER_CONFIRMED', 'ORDER_READY', 'ORDER_COMPLETED', 'ORDER_CANCELLED', 'DEMAND_MATCH', 'HARVEST_AT_RISK', 'SYSTEM');

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "role" "Role" NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" SERIAL NOT NULL,
    "province" "Province" NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crops" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "category" "CropCategory" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "crops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crop_shelf_lives" (
    "id" SERIAL NOT NULL,
    "cropId" INTEGER NOT NULL,
    "storage" "StorageCondition" NOT NULL,
    "days" INTEGER NOT NULL,

    CONSTRAINT "crop_shelf_lives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "farms" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ownerId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "locationId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "farms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "harvests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "farmId" UUID NOT NULL,
    "cropId" INTEGER NOT NULL,
    "harvestDate" DATE NOT NULL,
    "availableFrom" DATE NOT NULL,
    "storage" "StorageCondition" NOT NULL,
    "quantityKg" DECIMAL(10,2) NOT NULL,
    "reservedKg" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "soldKg" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "askingPricePerKg" DECIMAL(10,2),
    "currency" "Currency" NOT NULL DEFAULT 'USD',
    "status" "HarvestStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "harvests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "businesses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ownerId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "BusinessType" NOT NULL,
    "locationId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "businesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demands" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "businessId" UUID NOT NULL,
    "cropId" INTEGER NOT NULL,
    "quantityKg" DECIMAL(10,2) NOT NULL,
    "fulfilledKg" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "neededBy" DATE NOT NULL,
    "locationId" INTEGER NOT NULL,
    "maxPricePerKg" DECIMAL(10,2),
    "currency" "Currency" NOT NULL DEFAULT 'USD',
    "status" "DemandStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "demands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "businessId" UUID NOT NULL,
    "farmId" UUID NOT NULL,
    "demandId" UUID,
    "status" "OrderStatus" NOT NULL DEFAULT 'REQUESTED',
    "initiatedBy" "Role" NOT NULL,
    "note" TEXT,
    "cancelReason" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "readyAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orderId" UUID NOT NULL,
    "harvestId" UUID NOT NULL,
    "quantityKg" DECIMAL(10,2) NOT NULL,
    "pricePerKg" DECIMAL(10,2),
    "currency" "Currency" NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profileId" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "data" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "profiles_role_idx" ON "profiles"("role");

-- CreateIndex
CREATE INDEX "profiles_phone_idx" ON "profiles"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "locations_province_name_key" ON "locations"("province", "name");

-- CreateIndex
CREATE UNIQUE INDEX "crops_name_key" ON "crops"("name");

-- CreateIndex
CREATE UNIQUE INDEX "crop_shelf_lives_cropId_storage_key" ON "crop_shelf_lives"("cropId", "storage");

-- CreateIndex
CREATE INDEX "farms_ownerId_idx" ON "farms"("ownerId");

-- CreateIndex
CREATE INDEX "farms_locationId_idx" ON "farms"("locationId");

-- CreateIndex
CREATE INDEX "harvests_cropId_status_idx" ON "harvests"("cropId", "status");

-- CreateIndex
CREATE INDEX "harvests_farmId_idx" ON "harvests"("farmId");

-- CreateIndex
CREATE INDEX "businesses_ownerId_idx" ON "businesses"("ownerId");

-- CreateIndex
CREATE INDEX "businesses_locationId_idx" ON "businesses"("locationId");

-- CreateIndex
CREATE INDEX "demands_cropId_status_neededBy_idx" ON "demands"("cropId", "status", "neededBy");

-- CreateIndex
CREATE INDEX "demands_businessId_idx" ON "demands"("businessId");

-- CreateIndex
CREATE INDEX "orders_businessId_status_idx" ON "orders"("businessId", "status");

-- CreateIndex
CREATE INDEX "orders_farmId_status_idx" ON "orders"("farmId", "status");

-- CreateIndex
CREATE INDEX "orders_demandId_idx" ON "orders"("demandId");

-- CreateIndex
CREATE INDEX "order_items_harvestId_idx" ON "order_items"("harvestId");

-- CreateIndex
CREATE UNIQUE INDEX "order_items_orderId_harvestId_key" ON "order_items"("orderId", "harvestId");

-- CreateIndex
CREATE INDEX "notifications_profileId_readAt_createdAt_idx" ON "notifications"("profileId", "readAt", "createdAt");

-- AddForeignKey
ALTER TABLE "crop_shelf_lives" ADD CONSTRAINT "crop_shelf_lives_cropId_fkey" FOREIGN KEY ("cropId") REFERENCES "crops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farms" ADD CONSTRAINT "farms_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farms" ADD CONSTRAINT "farms_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "harvests" ADD CONSTRAINT "harvests_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "harvests" ADD CONSTRAINT "harvests_cropId_fkey" FOREIGN KEY ("cropId") REFERENCES "crops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demands" ADD CONSTRAINT "demands_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demands" ADD CONSTRAINT "demands_cropId_fkey" FOREIGN KEY ("cropId") REFERENCES "crops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demands" ADD CONSTRAINT "demands_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_demandId_fkey" FOREIGN KEY ("demandId") REFERENCES "demands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_harvestId_fkey" FOREIGN KEY ("harvestId") REFERENCES "harvests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- PostHarvest Phase 2: constraints, RLS, auth link
-- Append this block to the END of the migration.sql that
-- `prisma migrate dev --create-only` generates.
-- ============================================================

-- ---------- CHECK constraints (Prisma cannot express these) ----------

ALTER TABLE "harvests"
  ADD CONSTRAINT "harvests_quantity_positive" CHECK ("quantityKg" > 0),
  ADD CONSTRAINT "harvests_reserved_nonneg"   CHECK ("reservedKg" >= 0),
  ADD CONSTRAINT "harvests_sold_nonneg"       CHECK ("soldKg" >= 0),
  ADD CONSTRAINT "harvests_no_oversell"       CHECK ("reservedKg" + "soldKg" <= "quantityKg"),
  ADD CONSTRAINT "harvests_dates_ordered"     CHECK ("availableFrom" >= "harvestDate"),
  ADD CONSTRAINT "harvests_price_nonneg"      CHECK ("askingPricePerKg" IS NULL OR "askingPricePerKg" >= 0);

ALTER TABLE "demands"
  ADD CONSTRAINT "demands_quantity_positive"  CHECK ("quantityKg" > 0),
  ADD CONSTRAINT "demands_fulfilled_nonneg"   CHECK ("fulfilledKg" >= 0),
  ADD CONSTRAINT "demands_no_overfulfil"      CHECK ("fulfilledKg" <= "quantityKg"),
  ADD CONSTRAINT "demands_price_nonneg"       CHECK ("maxPricePerKg" IS NULL OR "maxPricePerKg" >= 0);

ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_quantity_positive" CHECK ("quantityKg" > 0),
  ADD CONSTRAINT "order_items_price_nonneg"      CHECK ("pricePerKg" IS NULL OR "pricePerKg" >= 0);

ALTER TABLE "crop_shelf_lives"
  ADD CONSTRAINT "crop_shelf_lives_days_positive" CHECK ("days" > 0);

-- ---------- Row Level Security: deny by default ----------
-- Supabase exposes the public schema through its Data API. With RLS enabled
-- and NO policies, the publishable key can read nothing. Express/Prisma connects
-- as a privileged role that bypasses RLS, so the API keeps working.
-- Policies are added later, only for tables the browser reads directly.

ALTER TABLE "profiles"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "locations"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crops"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crop_shelf_lives" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "farms"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "harvests"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "businesses"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "demands"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "orders"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order_items"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications"    ENABLE ROW LEVEL SECURITY;


-- ---------- Link Profile to Supabase Auth ----------
-- Guarded so the migration also succeeds in Prisma's shadow database,
-- which has no "auth" schema.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'auth' AND table_name = 'users'
  ) THEN
    ALTER TABLE "profiles"
      ADD CONSTRAINT "profiles_id_fkey"
      FOREIGN KEY ("id") REFERENCES auth.users (id) ON DELETE CASCADE;
  END IF;
END $$;
