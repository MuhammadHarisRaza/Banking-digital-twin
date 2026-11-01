import { Camera } from "lucide-react";
import AppLandingShell from "../components/common/AppLandingShell";

export default function DigitalEyeLaunch() {
  return (
    <AppLandingShell
      appKey="digitalEye"
      envVar="VITE_DIGITAL_EYE_URL"
      title="Digital Eye"
      tagline="Branch Surveillance & Operations"
      icon={Camera}
      accent="blue"
      capabilities={["Branch camera coverage", "Queue and counter monitoring", "Operational alerts"]}
    />
  );
}
