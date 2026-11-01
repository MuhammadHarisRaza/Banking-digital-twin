import hub from "../assets/images/branch-hub.jpg";
import corporate from "../assets/images/branch-corporate.jpg";
import islamic from "../assets/images/branch-islamic.jpg";
import retail from "../assets/images/branch-retail.jpg";
import { seeded } from "../lib/seeded";
import type {
  AgentStatus,
  AppId,
  Branch,
  BranchStatus,
  BranchType,
  DeploymentStatus,
} from "../types";

/** All branches, coordinates and figures are illustrative demo data. */
export const DEFAULT_BRANCH_ID = "BR-0387";

const IMAGES: Record<BranchType, string> = {
  Retail: retail,
  Corporate: corporate,
  Islamic: islamic,
  "Regional Hub": hub,
};

const APPS_BY_TYPE: Record<BranchType, AppId[]> = {
  Retail: ["customer360", "knowledgeRag", "loansOrigination", "branchOperations"],
  Corporate: ["customer360", "loansOrigination", "branchOperations", "tradeFinance", "amlMonitor", "cashManagement"],
  Islamic: ["customer360", "knowledgeRag", "branchOperations", "shariahDesk", "complaintDesk"],
  "Regional Hub": ["customer360", "knowledgeRag", "loansOrigination", "branchOperations", "amlMonitor", "cardsManagement", "complaintDesk"],
};

const AGENTS_BY_TYPE: Record<BranchType, string[]> = {
  Retail: ["tellerAssist", "policyCopilot", "creditPreScreen", "queueOptimizer", "nextBestOffer", "collectionsNudge"],
  Corporate: ["tradeDocsChecker", "amlSentinel", "cashForecaster", "creditPreScreen"],
  Islamic: ["shariahAdvisor", "policyCopilot", "tellerAssist", "complaintRouter"],
  "Regional Hub": ["amlSentinel", "policyCopilot", "creditPreScreen", "kycVerifier", "cardDisputeTriage", "branchAuditPrep"],
};

const DEPLOY_DATES = ["14 Sep 2026", "02 Oct 2026", "21 Aug 2026", "09 Jul 2026", "18 Oct 2026"];

type Seed = [
  id: string,
  name: string,
  city: string,
  province: string,
  lat: number,
  lng: number,
  tier: Branch["tier"],
  type: BranchType,
  established: number,
  agentCount: number,
  status?: BranchStatus,
];

const SEEDS: Seed[] = [
  ["BR-0387", "Karachi – Clifton Branch", "Karachi", "Sindh", 24.8138, 67.03, "primary", "Retail", 2016, 2],
  ["BR-0112", "Karachi – North Nazimabad Branch", "Karachi", "Sindh", 24.9372, 67.0423, "secondary", "Retail", 2009, 2],
  ["BR-0641", "Karachi – Korangi Branch", "Karachi", "Sindh", 24.831, 67.129, "secondary", "Corporate", 2012, 2],
  ["BR-0204", "Hyderabad – Saddar Branch", "Hyderabad", "Sindh", 25.396, 68.3578, "primary", "Retail", 2006, 2],
  ["BR-0519", "Sukkur – Military Road Branch", "Sukkur", "Sindh", 27.7052, 68.8574, "primary", "Retail", 2011, 1],
  ["BR-0733", "Larkana Branch", "Larkana", "Sindh", 27.557, 68.2141, "secondary", "Islamic", 2018, 1, "Under Maintenance"],
  ["BR-0855", "Nawabshah Branch", "Nawabshah", "Sindh", 26.2442, 68.41, "primary", "Retail", 2015, 1],
  ["BR-0266", "Quetta – Jinnah Road Branch", "Quetta", "Balochistan", 30.1798, 66.975, "primary", "Regional Hub", 2004, 3],
  ["BR-0902", "Gwadar Branch", "Gwadar", "Balochistan", 25.1264, 62.3225, "primary", "Corporate", 2019, 2],
  ["BR-0915", "Turbat Branch", "Turbat", "Balochistan", 26.0023, 63.044, "primary", "Islamic", 2020, 1],
  ["BR-0928", "Khuzdar Branch", "Khuzdar", "Balochistan", 27.8, 66.61, "primary", "Retail", 2017, 1],
  ["BR-0941", "Zhob Branch", "Zhob", "Balochistan", 31.3417, 69.4486, "primary", "Islamic", 2021, 1, "Limited Service"],
  ["BR-0310", "Multan – Cantt Branch", "Multan", "Punjab", 30.1575, 71.5249, "primary", "Regional Hub", 2003, 3],
  ["BR-0355", "Bahawalpur Branch", "Bahawalpur", "Punjab", 29.3956, 71.6836, "secondary", "Retail", 2010, 2],
  ["BR-0372", "Dera Ghazi Khan Branch", "Dera Ghazi Khan", "Punjab", 30.0561, 70.6348, "primary", "Islamic", 2014, 1],
  ["BR-0148", "Faisalabad – D Ground Branch", "Faisalabad", "Punjab", 31.4187, 73.0791, "primary", "Corporate", 2005, 3],
  ["BR-0101", "Lahore – Gulberg Branch", "Lahore", "Punjab", 31.5204, 74.3587, "primary", "Regional Hub", 2001, 4],
  ["BR-0126", "Lahore – Mall Road Branch", "Lahore", "Punjab", 31.558, 74.3287, "secondary", "Retail", 2003, 3],
  ["BR-0177", "Gujranwala Branch", "Gujranwala", "Punjab", 32.1877, 74.1945, "secondary", "Retail", 2008, 2],
  ["BR-0189", "Sialkot Branch", "Sialkot", "Punjab", 32.4945, 74.5229, "primary", "Corporate", 2007, 2],
  ["BR-0195", "Sargodha Branch", "Sargodha", "Punjab", 32.0836, 72.6711, "primary", "Retail", 2013, 2],
  ["BR-0225", "Rawalpindi – Saddar Branch", "Rawalpindi", "Punjab", 33.5973, 73.0479, "secondary", "Retail", 2006, 2],
  ["BR-0218", "Islamabad – Blue Area Branch", "Islamabad", "Islamabad Capital Territory", 33.71, 73.06, "primary", "Regional Hub", 2002, 4],
  ["BR-0421", "Peshawar – University Road Branch", "Peshawar", "Khyber Pakhtunkhwa", 34.0, 71.5, "primary", "Regional Hub", 2005, 3],
  ["BR-0447", "Mardan Branch", "Mardan", "Khyber Pakhtunkhwa", 34.1989, 72.0231, "secondary", "Islamic", 2016, 1],
  ["BR-0462", "Swat – Mingora Branch", "Swat", "Khyber Pakhtunkhwa", 34.7717, 72.36, "primary", "Retail", 2015, 1],
  ["BR-0478", "Abbottabad Branch", "Abbottabad", "Khyber Pakhtunkhwa", 34.1688, 73.2215, "secondary", "Retail", 2012, 2],
  ["BR-0491", "Chitral Branch", "Chitral", "Khyber Pakhtunkhwa", 35.8518, 71.7864, "primary", "Islamic", 2022, 1],
  ["BR-0505", "Gilgit Branch", "Gilgit", "Gilgit-Baltistan", 35.9208, 74.308, "primary", "Retail", 2018, 1],
  ["BR-0512", "Skardu Branch", "Skardu", "Gilgit-Baltistan", 35.2971, 75.6333, "primary", "Islamic", 2021, 1, "Limited Service"],
  ["BR-0528", "Muzaffarabad Branch", "Muzaffarabad", "Azad Kashmir", 34.37, 73.4711, "secondary", "Retail", 2017, 1],
];

/** City, province, lat, lng and neighbourhood for branches beyond the anchor list above. */
type NetworkSeed = [city: string, province: string, lat: number, lng: number, area?: string];

const SIN = "Sindh";
const PUN = "Punjab";
const KPK = "Khyber Pakhtunkhwa";
const BAL = "Balochistan";
const ICT = "Islamabad Capital Territory";
const AJK = "Azad Kashmir";
const GB = "Gilgit-Baltistan";

const NETWORK: NetworkSeed[] = [
  ["Karachi", SIN, 24.79, 67.065, "DHA Phase 6"],
  ["Karachi", SIN, 24.92, 67.095, "Gulshan-e-Iqbal"],
  ["Karachi", SIN, 24.86, 67.025, "Saddar"],
  ["Karachi", SIN, 24.872, 67.059, "Tariq Road"],
  ["Karachi", SIN, 24.909, 67.132, "Gulistan-e-Johar"],
  ["Karachi", SIN, 24.893, 67.195, "Malir"],
  ["Karachi", SIN, 24.898, 66.995, "SITE"],
  ["Karachi", SIN, 24.882, 67.068, "Bahadurabad"],
  ["Karachi", SIN, 24.908, 67.03, "Nazimabad"],
  ["Karachi", SIN, 24.934, 67.073, "Federal B Area"],
  ["Karachi", SIN, 24.85, 67.2, "Landhi"],
  ["Hyderabad", SIN, 25.37, 68.37, "Latifabad"],
  ["Hyderabad", SIN, 25.405, 68.33, "Qasimabad"],
  ["Mirpur Khas", SIN, 25.5276, 69.0159],
  ["Khairpur", SIN, 27.5295, 68.7592],
  ["Shikarpur", SIN, 27.9556, 68.6382],
  ["Jacobabad", SIN, 28.2769, 68.4514],
  ["Dadu", SIN, 26.7319, 67.775],
  ["Thatta", SIN, 24.7467, 67.9239],
  ["Badin", SIN, 24.656, 68.838],
  ["Sanghar", SIN, 26.0465, 68.9481],
  ["Tando Allahyar", SIN, 25.46, 68.7167],
  ["Ghotki", SIN, 28.006, 69.316],
  ["Umerkot", SIN, 25.3615, 69.7361],
  ["Lahore", PUN, 31.461, 74.408, "DHA Phase 5"],
  ["Lahore", PUN, 31.4697, 74.2728, "Johar Town"],
  ["Lahore", PUN, 31.483, 74.323, "Model Town"],
  ["Lahore", PUN, 31.512, 74.389, "Cantt"],
  ["Lahore", PUN, 31.51, 74.29, "Allama Iqbal Town"],
  ["Lahore", PUN, 31.503, 74.326, "Garden Town"],
  ["Lahore", PUN, 31.62, 74.287, "Shahdara"],
  ["Lahore", PUN, 31.431, 74.266, "Wapda Town"],
  ["Lahore", PUN, 31.37, 74.182, "Bahria Town"],
  ["Lahore", PUN, 31.57, 74.31, "Anarkali"],
  ["Lahore", PUN, 31.462, 74.305, "Township"],
  ["Faisalabad", PUN, 31.399, 73.1, "Peoples Colony"],
  ["Faisalabad", PUN, 31.405, 73.097, "Susan Road"],
  ["Faisalabad", PUN, 31.395, 73.07, "Satiana Road"],
  ["Faisalabad", PUN, 31.415, 73.115, "Madina Town"],
  ["Rawalpindi", PUN, 33.635, 73.068, "Satellite Town"],
  ["Rawalpindi", PUN, 33.521, 73.095, "Bahria Town"],
  ["Rawalpindi", PUN, 33.585, 73.088, "Chaklala"],
  ["Islamabad", ICT, 33.696, 73.013, "F-10 Markaz"],
  ["Islamabad", ICT, 33.687, 73.03, "G-9 Markaz"],
  ["Islamabad", ICT, 33.668, 73.075, "I-8 Markaz"],
  ["Islamabad", ICT, 33.53, 73.155, "DHA"],
  ["Multan", PUN, 30.22, 71.475, "Bosan Road"],
  ["Multan", PUN, 30.21, 71.47, "Gulgasht"],
  ["Multan", PUN, 30.196, 71.448, "Shah Rukn-e-Alam"],
  ["Gujranwala", PUN, 32.17, 74.195, "Model Town"],
  ["Gujranwala", PUN, 32.155, 74.19, "Satellite Town"],
  ["Sialkot", PUN, 32.51, 74.535, "Cantt"],
  ["Daska", PUN, 32.324, 74.35],
  ["Sheikhupura", PUN, 31.7131, 73.9783],
  ["Kasur", PUN, 31.1167, 74.45],
  ["Okara", PUN, 30.8138, 73.4534],
  ["Sahiwal", PUN, 30.6682, 73.1114],
  ["Pakpattan", PUN, 30.3431, 73.3863],
  ["Vehari", PUN, 30.0442, 72.3441],
  ["Khanewal", PUN, 30.3017, 71.9321],
  ["Lodhran", PUN, 29.5405, 71.6336],
  ["Rahim Yar Khan", PUN, 28.4212, 70.2989],
  ["Bahawalnagar", PUN, 29.9987, 73.2536],
  ["Muzaffargarh", PUN, 30.0736, 71.1936],
  ["Layyah", PUN, 30.9693, 70.9428],
  ["Rajanpur", PUN, 29.104, 70.33],
  ["Jhang", PUN, 31.2681, 72.3181],
  ["Toba Tek Singh", PUN, 30.9709, 72.4826],
  ["Chiniot", PUN, 31.72, 72.9789],
  ["Hafizabad", PUN, 32.0679, 73.6881],
  ["Mandi Bahauddin", PUN, 32.5861, 73.4917],
  ["Gujrat", PUN, 32.5742, 74.0789],
  ["Jhelum", PUN, 32.9425, 73.7257],
  ["Chakwal", PUN, 32.9328, 72.863],
  ["Attock", PUN, 33.766, 72.3609],
  ["Mianwali", PUN, 32.5839, 71.537],
  ["Khushab", PUN, 32.2967, 72.3525],
  ["Bhakkar", PUN, 31.6253, 71.0657],
  ["Narowal", PUN, 32.1014, 74.88],
  ["Nankana Sahib", PUN, 31.45, 73.71],
  ["Wah Cantt", PUN, 33.7715, 72.751],
  ["Taxila", PUN, 33.746, 72.8397],
  ["Peshawar", KPK, 33.983, 71.435, "Hayatabad"],
  ["Peshawar", KPK, 34.004, 71.543, "Saddar"],
  ["Nowshera", KPK, 34.0153, 71.9747],
  ["Charsadda", KPK, 34.1453, 71.7308],
  ["Swabi", KPK, 34.1201, 72.4702],
  ["Kohat", KPK, 33.5869, 71.4414],
  ["Bannu", KPK, 32.9889, 70.6056],
  ["Dera Ismail Khan", KPK, 31.8313, 70.9017],
  ["Mansehra", KPK, 34.3333, 73.2],
  ["Haripur", KPK, 33.9946, 72.9106],
  ["Timergara", KPK, 34.828, 71.842],
  ["Batkhela", KPK, 34.618, 71.972],
  ["Hangu", KPK, 33.53, 71.06],
  ["Karak", KPK, 33.11, 71.09],
  ["Tank", KPK, 32.217, 70.383],
  ["Quetta", BAL, 30.205, 67.015, "Satellite Town"],
  ["Quetta", BAL, 30.15, 66.98, "Sariab Road"],
  ["Hub", BAL, 25.0483, 66.8867],
  ["Sibi", BAL, 29.5448, 67.8764],
  ["Loralai", BAL, 30.3705, 68.5979],
  ["Chaman", BAL, 30.921, 66.4597],
  ["Panjgur", BAL, 26.9644, 64.091],
  ["Dera Murad Jamali", BAL, 28.55, 68.22],
  ["Uthal", BAL, 25.808, 66.62],
  ["Pishin", BAL, 30.58, 67.0],
  ["Kalat", BAL, 29.026, 66.59],
  ["Mirpur", AJK, 33.1484, 73.7518],
  ["Kotli", AJK, 33.5183, 73.9022],
  ["Rawalakot", AJK, 33.8578, 73.7604],
  ["Bagh", AJK, 33.981, 73.776],
  ["Hunza", GB, 36.31, 74.62],
  ["Chilas", GB, 35.42, 74.1],
];

function toSeed([city, province, lat, lng, area]: NetworkSeed, index: number): Seed {
  const rand = seeded(`${city}-${area ?? "main"}`);
  const roll = rand();
  const type: BranchType = roll < 0.38 ? "Islamic" : area && roll > 0.9 ? "Corporate" : "Retail";
  const name = area ? `${city} – ${area} Branch` : `${city} Branch`;
  const id = `BR-${1103 + index * 7}`;
  const established = 1998 + Math.floor(rand() * 26);
  const agentCount = 1 + Math.floor(rand() * 2);
  const status: BranchStatus = rand() > 0.96 ? "Limited Service" : "Operational";
  return [id, name, city, province, lat, lng, "secondary", type, established, agentCount, status];
}

const METRO_CITIES = new Set(["Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Peshawar", "Quetta"]);

const STAFF_BASE: Record<BranchType, number> = { Retail: 18, Islamic: 14, Corporate: 26, "Regional Hub": 42 };

/** Average balances follow a large Pakistani retail bank: roughly PKR 255k per customer. */
function financials(activeCustomers: number, rand: () => number) {
  const deposits = Math.round((activeCustomers * (190 + rand() * 130)) / 1000);
  return {
    deposits,
    advances: Math.round(deposits * (0.35 + rand() * 0.2)),
    accounts: Math.round(activeCustomers * (1.2 + rand() * 0.3)),
  };
}

function buildBranch(seed: Seed): Branch {
  const [id, name, city, province, lat, lng, tier, type, established, agentCount, status = "Operational"] = seed;
  const rand = seeded(id);
  const staff = STAFF_BASE[type] + Math.floor(rand() * 14);

  const applications = APPS_BY_TYPE[type].map((appId, i) => {
    const roll = rand();
    const appStatus: DeploymentStatus = roll > 0.9 ? "Upgrading" : roll > 0.8 ? "Pilot" : "In Use";
    return { appId, status: appStatus, deployedOn: DEPLOY_DATES[(i + Math.floor(rand() * 5)) % 5] };
  });

  const agents = AGENTS_BY_TYPE[type].slice(0, agentCount).map((agentId) => {
    const roll = rand();
    const agentStatus: AgentStatus = roll > 0.85 ? "Paused" : roll > 0.55 ? "Supervised" : "Active";
    return { agentId, status: agentStatus };
  });

  const dailyTransactions = Math.round(staff * (150 + rand() * 90));
  const activeCustomers = Math.round(staff * (520 + rand() * 300));
  const sla = Math.round((status === "Operational" ? 97.4 + rand() * 2 : 94.2 + rand() * 2) * 10) / 10;
  const transactionsTrend = Math.round(1 + rand() * 7);
  const customersTrend = Math.round(1 + rand() * 5);

  return {
    id,
    name,
    city,
    province,
    lat,
    lng,
    tier,
    type,
    established,
    status,
    staff,
    dailyTransactions,
    transactionsTrend,
    activeCustomers,
    customersTrend,
    sla,
    region: METRO_CITIES.has(city) ? `${city} Region` : `${province} Region`,
    ...financials(activeCustomers, rand),
    atms: tier === "primary" ? 2 + Math.floor(rand() * 3) : 1 + Math.floor(rand() * 2),
    digitalAdoption: Math.round(52 + rand() * 29),
    saturdayBanking: rand() < 0.3,
    lockers: rand() < 0.45,
    applications,
    agents,
    image: IMAGES[type],
  };
}

export const BRANCHES: Branch[] = [...SEEDS, ...NETWORK.map(toSeed)].map(buildBranch).map((branch) =>
  branch.id === DEFAULT_BRANCH_ID
    ? {
        ...branch,
        staff: 24,
        dailyTransactions: 4892,
        transactionsTrend: 6,
        activeCustomers: 18406,
        customersTrend: 4,
        sla: 98.7,
        deposits: 4692,
        advances: 2058,
        accounts: 24180,
        applications: branch.applications.map((a) => ({ ...a, status: "In Use" })),
        agents: branch.agents.map((a) => ({ ...a, status: "Active" })),
      }
    : branch,
);

export const getBranch = (id: string | null) => BRANCHES.find((b) => b.id === id);
