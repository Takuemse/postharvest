import { useAuth } from "../context/AuthContext";
import BuyerDashboard from "./BuyerDashboard";
import FarmerDashboard from "./FarmerDashboard";

export default function AppHome() {
  const { role } = useAuth();
  return role === "FARMER" ? <FarmerDashboard /> : <BuyerDashboard />;
}