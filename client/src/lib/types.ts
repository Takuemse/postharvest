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

export type Fit = "STRONG" | "GOOD" | "POSSIBLE";

type Delivery = { date: string; transitDays: number };

export type FarmerMatch = {
  demandId: string;
  buyer: { name: string; type: string; town: string };
  requestedKg: number;
  neededBy: string;
  matchedKg: number;
  score: number;
  fit: Fit;
  coversAll: boolean;
  delivery: Delivery;
  daysLeftAtDelivery: number;
  reasons: string[];
};

export type BuyerMatch = {
  harvestId: string;
  farm: { name: string; town: string };
  availableKg: number;
  harvestDate: string;
  storage: Storage;
  asking: { pricePerKg: number; currency: "USD" | "ZWG" } | null;
  matchedKg: number;
  score: number;
  fit: Fit;
  coversAll: boolean;
  delivery: Delivery;
  daysLeftAtDelivery: number;
  reasons: string[];
};