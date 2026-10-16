import { useAuth } from "../context/AuthContext";
import AdminOverview from "./AdminOverview";
import BuyerDashboard from "./BuyerDashboard";
import FarmerDashboard from "./FarmerDashboard";

export default function AppHome() {
  const { role } = useAuth();
  if (role === "ADMIN") return <AdminOverview />;
  return role === "FARMER" ? <FarmerDashboard /> : <BuyerDashboard />;
}