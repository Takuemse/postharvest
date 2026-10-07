export type Urgency = "SAFE" | "ATTENTION" | "URGENT";
export type StockState = "AVAILABLE" | "PARTLY_RESERVED" | "FULLY_RESERVED" | "SOLD_OUT";
export type Storage = "AMBIENT" | "COOL" | "REFRIGERATED";

export type Harvest = {
  id: string;
  crop: { id: number; name: string };
  farm: { id: string; name: string; location: { name: string } };
  harvestDate: string;
  storage: Storage;
  quantityKg: number;
  reservedKg: number;
  soldKg: number;
  availableKg: number;
  stockState: StockState;
  shelfLifeDays: number | null;
  urgency: Urgency | null;
  ageDays: number | null;
  daysRemaining: number | null;
  pastShelfLife: boolean;
  askingPricePerKg: number | null;
  currency: "USD" | "ZWG";
  notes: string | null;
};

export type Crop = { id: number; name: string; shelfLives: { storage: Storage; days: number }[] };

export type DemandState = "OPEN" | "PARTLY_FULFILLED" | "FULFILLED" | "OVERDUE" | "CLOSED" | "CANCELLED";

export type Demand = {
  id: string;
  business: { id: string; name: string };
  crop: { id: number; name: string };
  location: { id: number; name: string; province: string };
  quantityKg: number;
  fulfilledKg: number;
  remainingKg: number;
  neededBy: string;
  daysUntilNeeded: number;
  state: DemandState;
  maxPricePerKg: number | null;
  currency: "USD" | "ZWG";
  notes: string | null;
};

export type Business = {
  id: string;
  name: string;
  type: string;
  location: { id: number; name: string; province: string };
};