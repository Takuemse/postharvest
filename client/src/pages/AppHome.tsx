import { AppShell } from "../components/AppShell";
import { useAuth } from "../context/AuthContext";
import FarmerDashboard from "./FarmerDashboard";

export default function AppHome() {
  const { role } = useAuth();
  if (role === "FARMER") return <FarmerDashboard />;
  return (
    <AppShell>
      <h1 className="font-display text-4xl font-medium">Your dashboard is on the way.</h1>
      <p className="mt-3 max-w-md text-lg text-ink/70">The buyer experience is the next thing we build.</p>
    </AppShell>
  );
}