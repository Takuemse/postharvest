import { Navigate, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import AppHome from "./pages/AppHome";
import BuyerRegister from "./pages/BuyerRegister";
import FarmerOnboarding from "./pages/FarmerOnboarding";
import AddHarvest from "./pages/AddHarvest";
import HarvestDetail from "./pages/HarvestDetail";
import EditHarvest from "./pages/EditHarvest";
import AddDemand from "./pages/AddDemand";
import DemandDetail from "./pages/DemandDetail";

function Protected({ children }: { children: ReactNode }) {
  const { session, role, loading } = useAuth();
  if (loading) return null;
  if (!session) return <Navigate to="/login" replace />;
  if (!role) return <Navigate to="/onboarding/farmer" replace />; // signed in, no role yet
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register/buyer" element={<BuyerRegister />} />
      <Route path="/onboarding/farmer" element={<FarmerOnboarding />} />
      <Route path="/app" element={<Protected><AppHome /></Protected>} />

      <Route path="*" element={<Navigate to="/login" replace />} />
      <Route path="/harvests/new" element={<Protected><AddHarvest /></Protected>} />
      <Route path="/harvests/:id" element={<Protected><HarvestDetail /></Protected>} />
      <Route path="/harvests/:id/edit" element={<Protected><EditHarvest /></Protected>} />
      <Route path="/demands/new" element={<Protected><AddDemand /></Protected>} />
      <Route path="/demands/:id" element={<Protected><DemandDetail /></Protected>} />
    </Routes>
  );
}