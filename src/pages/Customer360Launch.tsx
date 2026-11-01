import { Users } from "lucide-react";
import AppLandingShell from "../components/common/AppLandingShell";

export default function Customer360Launch() {
  return (
    <AppLandingShell
      appKey="customer360"
      envVar="VITE_CUSTOMER_360_URL"
      title="Customer 360 (C360)"
      tagline="Customer View & Relationship Management"
      icon={Users}
      accent="green"
      capabilities={["Unified customer profile", "Relationship history", "Next best action for relationship managers"]}
    />
  );
}
