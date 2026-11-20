import { useBrand, useThemeColors } from "../../config/useBrand";
import type { Asset, BranchLayout } from "../layout/types";
import { Atm, CashDeposit, ChequeKiosk } from "./kit/SelfService";
import { GuardPodium, Reception, TellerCounter, TokenKiosk } from "./kit/Counters";
import { HallPlants, Seating, TokenBoard } from "./kit/Hall";
import { Cctv, Lockers, Vault } from "./kit/Secure";
import { Records, StaffRoom, Washrooms } from "./kit/Support";
import { BackOffice, Lounge, ManagerOffice, MeetingRoom, PrayerRoom, ServerRoom, ServiceDesk } from "./kit/Workplaces";
import { brandMaterials } from "./materials";
import { Selectable } from "./Selectable";

/**
 * Places the furniture and equipment kit (scene/kit) at the layout's assets. Each asset is wrapped in
 * <Selectable>, so it can be hovered, clicked, framed by the camera and shown in the inspector.
 */
export function Fixtures({ layout }: { layout: BranchLayout }) {
  const { brand, islamic } = useThemeColors();
  const { shortName } = useBrand();
  const accent = layout.archetype === "islamic" ? islamic : brand;
  const brandMats = brandMaterials(accent);
  const tellers = layout.assets.filter((a) => a.kind === "teller");
  const tellerWidth = tellers.length > 1 ? tellers[1].x - tellers[0].x : 2.4;

  const render = (asset: Asset) => {
    switch (asset.kind) {
      case "teller":
        return <TellerCounter asset={asset} width={tellerWidth} accent={accent} />;
      case "desk":
        return <ServiceDesk asset={asset} first={asset.index === 1} />;
      case "kiosk":
        return <TokenKiosk asset={asset} brand={brandMats.brand} />;
      case "reception":
        return <Reception asset={asset} brand={brandMats.brand} bankName={shortName} />;
      case "atm":
        return <Atm asset={asset} brand={brandMats} />;
      case "cdm":
        return <CashDeposit asset={asset} brand={brandMats} />;
      case "chequeKiosk":
        return <ChequeKiosk asset={asset} brand={brandMats} />;
      case "manager":
        return <ManagerOffice asset={asset} />;
      case "vault":
        return <Vault layout={layout} />;
      case "lockers":
        return <Lockers layout={layout} />;
      case "backOffice":
        return <BackOffice layout={layout} />;
      case "server":
        return <ServerRoom layout={layout} />;
      case "cctv":
        return <Cctv asset={asset} />;
      case "guard":
        return <GuardPodium asset={asset} />;
      case "tokenBoard":
        return <TokenBoard asset={asset} brand={accent} layout={layout} />;
      case "prayer":
        return <PrayerRoom layout={layout} />;
      case "meeting":
        return <MeetingRoom layout={layout} />;
      case "lounge":
        return <Lounge asset={asset} />;
      case "staffRoom":
        return <StaffRoom layout={layout} />;
      case "washroom":
        return <Washrooms layout={layout} />;
      case "records":
        return <Records layout={layout} />;
      default:
        return null;
    }
  };

  return (
    <group name="fixtures">
      {layout.assets
        .filter((a) => a.kind !== "entrance")
        .map((asset) => (
          <Selectable key={asset.id} id={asset.id} name={asset.name} layout={layout}>
            {render(asset)}
          </Selectable>
        ))}
      <Seating layout={layout} leather={layout.archetype === "corporate"} />
      <HallPlants layout={layout} />
    </group>
  );
}
