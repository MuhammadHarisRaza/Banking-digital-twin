import { UBL_CONFIG, type BankConfig } from "./bankConfig";

/**
 * The bundled photographs (branches, head office), the UBL logo files and the published figures all
 * belong to one real bank. When the platform is renamed to another bank they must not keep showing,
 * or a re-branded demo would present UBL's photos and numbers under another bank's name.
 */
const norm = (s: string) => s.trim().toLowerCase();

/** True while the brand still names the bank the bundled content belongs to (UBL). */
export function isBundledBank(brand: Pick<BankConfig["brand"], "bankName" | "shortName">) {
  return norm(brand.shortName) === norm(UBL_CONFIG.brand.shortName) || norm(brand.bankName).includes("united bank");
}

/** Bundled assets that show UBL itself (logo, icon and photographs). */
export const isBundledAsset = (token: string) => token.startsWith("asset:ubl");

const ORG_KEYS = ["hqName", "hqLocation", "registeredOffice", "islamicLabel", "networkSource", "branchFootnote", "hqFootnote", "deposits"] as const;

/** Organisation fields that are still UBL's own (left over after renaming the bank). */
export function staleOrganisation(config: BankConfig) {
  if (isBundledBank(config.brand)) return [];
  const org = config.organisation;
  const ubl = UBL_CONFIG.organisation;
  const stale: string[] = ORG_KEYS.filter((k) => org[k] === ubl[k]);
  if (org.milestones.some((m) => ubl.milestones.some((u) => u.title === m.title))) stale.push("milestones");
  if (isBundledAsset(org.hqImage) || isBundledAsset(org.hqAerialImage)) stale.push("photos");
  if (org.useBranchPhotos) stale.push("branchPhotos");
  if (config.brand.tagline === UBL_CONFIG.brand.tagline) stale.push("tagline");
  return stale;
}

/**
 * Neutral organisation details for a renamed bank: the old bank's names, addresses, published
 * figures, milestones and photographs are replaced with clearly illustrative placeholders that use
 * the new name. Coordinates, country, currency and locale are kept.
 */
export function neutralOrganisation(config: BankConfig, branchCount: number, islamicCount: number): BankConfig["organisation"] {
  const { shortName, bankName } = config.brand;
  const org = config.organisation;
  const city = org.hqLocation.split(",").pop()?.trim() || org.country;
  const staff = Math.round(branchCount * 13.5);
  return {
    ...org,
    hqName: `${shortName} Head Office`,
    hqLocation: city,
    registeredOffice: `${bankName}, ${city}`,
    hqImage: "",
    hqAerialImage: "",
    hqStaff: Math.round(staff * 0.15),
    branches: branchCount,
    branchesTrend: 0,
    staff,
    islamicBranches: islamicCount,
    islamicWindows: 0,
    deposits: "",
    digitalCustomers: "",
    islamicLabel: `${shortName} Islamic`,
    useBranchPhotos: false,
    milestones: [
      { title: `${shortName} network: ${branchCount.toLocaleString("en-US")} branches loaded`, detail: "From the branch list in Settings", time: "Today" },
      { title: "Digital onboarding available", detail: "Illustrative milestone, edit in Settings", time: "2025" },
      { title: `${shortName} Head Office`, detail: city, time: "—" },
    ],
    networkSource: "",
    branchFootnote: "Branch locations come from the loaded branch list. Staff, activity and performance are illustrative.",
    hqFootnote: "All figures on this page are illustrative demo data.",
  };
}
