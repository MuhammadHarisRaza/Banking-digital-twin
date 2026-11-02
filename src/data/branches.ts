import ameen1 from "../assets/images/ubl-ameen-01.jpg";
import ameen2 from "../assets/images/ubl-ameen-02.jpg";
import branch1 from "../assets/images/ubl-branch-01.jpg";
import branch2 from "../assets/images/ubl-branch-02.jpg";
import branch3 from "../assets/images/ubl-branch-03.jpg";
import branch4 from "../assets/images/ubl-branch-04.jpg";
import branch5 from "../assets/images/ubl-branch-05.jpg";
import { seeded } from "../lib/seeded";
import type { AgentStatus, AppId, Branch, BranchType, DeploymentStatus } from "../types";
import ublBranches from "./ubl-branches.json";

/**
 * Branch identity, type, location labels, address, ATM and lockers come from UBL's published list,
 * built by scripts/build-ubl-data.py. Map positions are approximate, placed at city level.
 * Staff, transactions, customers, applications and agents are illustrative demo data.
 */
interface PublishedBranch {
  code: string;
  category: string;
  name: string;
  city: string;
  district: string;
  region: string;
  cluster: string;
  area: string;
  address: string;
  atm: boolean;
  lockers: boolean;
  saturday: boolean;
  lat: number;
  lng: number;
  province: string;
}

/** Photos of UBL branches. Each is representative, not necessarily the branch it appears on. */
const IMAGES: Record<BranchType, string[]> = {
  Retail: [branch1, branch2, branch3, branch4, branch5],
  Islamic: [ameen1, ameen2],
  Corporate: [branch1],
};

const APPS_BY_TYPE: Record<BranchType, AppId[]> = {
  Retail: ["customer360", "knowledgeRag", "loansOrigination", "branchOperations"],
  Corporate: ["customer360", "loansOrigination", "branchOperations", "tradeFinance", "amlMonitor", "cashManagement"],
  Islamic: ["customer360", "knowledgeRag", "branchOperations", "shariahDesk", "complaintDesk"],
};

const AGENTS_BY_TYPE: Record<BranchType, string[]> = {
  Retail: ["tellerAssist", "policyCopilot", "creditPreScreen", "queueOptimizer", "nextBestOffer", "collectionsNudge"],
  Corporate: ["tradeDocsChecker", "amlSentinel", "cashForecaster", "creditPreScreen"],
  Islamic: ["shariahAdvisor", "policyCopilot", "tellerAssist", "complaintRouter"],
};

const STAFF_BASE: Record<BranchType, number> = { Retail: 12, Islamic: 11, Corporate: 26 };

const DEPLOY_DATES = ["14 Sep 2026", "02 Oct 2026", "21 Aug 2026", "09 Jul 2026", "18 Oct 2026"];

/** The first listed branch in each of these cities draws as a large marker. */
const PRIMARY_CITIES = new Set([
  "Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Peshawar", "Quetta", "Hyderabad",
  "Sukkur", "Gujranwala", "Sialkot", "Bahawalpur", "Abbottabad", "Sargodha", "Gwadar", "Turbat", "Khuzdar",
  "Zhob", "Gilgit", "Skardu", "Muzaffarabad", "Chitral",
]);

function buildBranch(source: PublishedBranch, tier: Branch["tier"]): Branch {
  const type: BranchType = source.category === "Islamic" || source.category === "Corporate" ? source.category : "Retail";
  const rand = seeded(source.code);
  const urban = source.area === "Urban";
  const staff = STAFF_BASE[type] + Math.floor(rand() * (urban ? 16 : 7));

  const applications = APPS_BY_TYPE[type].map((appId, i) => {
    const roll = rand();
    const status: DeploymentStatus = roll > 0.9 ? "Upgrading" : roll > 0.8 ? "Pilot" : "In Use";
    return { appId, status, deployedOn: DEPLOY_DATES[(i + Math.floor(rand() * 5)) % 5] };
  });

  const agents = AGENTS_BY_TYPE[type].slice(0, 1 + Math.floor(rand() * 3)).map((agentId) => {
    const roll = rand();
    const status: AgentStatus = roll > 0.85 ? "Paused" : roll > 0.55 ? "Supervised" : "Active";
    return { agentId, status };
  });

  return {
    id: `BR-${source.code}`,
    name: /branch/i.test(source.name) ? source.name : `${source.name} Branch`,
    city: source.city,
    district: source.district,
    province: source.province,
    region: source.region,
    cluster: source.cluster,
    area: source.area,
    address: source.address,
    lat: source.lat,
    lng: source.lng,
    tier,
    type,
    status: "Operational",
    atm: source.atm,
    lockers: source.lockers,
    saturdayBanking: source.saturday,
    staff,
    dailyTransactions: Math.round(staff * (110 + rand() * 90)),
    transactionsTrend: Math.round(1 + rand() * 7),
    activeCustomers: Math.round(staff * (420 + rand() * 300)),
    customersTrend: Math.round(1 + rand() * 5),
    applications,
    agents,
    image: IMAGES[type][Number(source.code) % IMAGES[type].length],
  };
}

const seenCities = new Set<string>();

export const BRANCHES: Branch[] = (ublBranches as PublishedBranch[]).map((source) => {
  const primary = PRIMARY_CITIES.has(source.city) && !seenCities.has(source.city);
  if (primary) seenCities.add(source.city);
  return buildBranch(source, primary ? "primary" : "secondary");
});

const BY_ID = new Map(BRANCHES.map((branch) => [branch.id, branch]));

export const getBranch = (id: string | null) => (id ? BY_ID.get(id) : undefined);

export const getCityBranch = (city: string) => BRANCHES.find((branch) => branch.city === city && branch.tier === "primary");
