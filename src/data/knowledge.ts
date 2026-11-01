import { seeded } from "../lib/seeded";
import type { AccessStatus, Branch, BranchKnowledge, KnowledgeBase } from "../types";

const KNOWLEDGE_BASES: KnowledgeBase[] = [
  { id: "kb-policy", name: "Retail Banking Policy Manual", category: "Policy", agentId: "policyCopilot" },
  { id: "kb-circulars", name: "Regulatory Circulars Digest", category: "Regulatory", agentId: "policyCopilot" },
  { id: "kb-teller", name: "Teller Procedures Handbook", category: "Operations", agentId: "tellerAssist" },
  { id: "kb-limits", name: "Transaction Limits Matrix", category: "Operations", agentId: "tellerAssist" },
  { id: "kb-credit", name: "Credit Underwriting Guide", category: "Lending", agentId: "creditPreScreen" },
  { id: "kb-staffing", name: "Counter Staffing Playbook", category: "Operations", agentId: "queueOptimizer" },
  { id: "kb-kyc", name: "KYC Onboarding Standards", category: "Compliance", agentId: "kycVerifier" },
  { id: "kb-aml", name: "AML Typologies Library", category: "Compliance", agentId: "amlSentinel" },
  { id: "kb-trade", name: "Trade Finance Rulebook", category: "Corporate", agentId: "tradeDocsChecker" },
  { id: "kb-shariah", name: "Shariah Standards Compendium", category: "Islamic Banking", agentId: "shariahAdvisor" },
  { id: "kb-murabaha", name: "Murabaha and Ijarah Product Guide", category: "Islamic Banking", agentId: "shariahAdvisor" },
  { id: "kb-complaints", name: "Complaint Handling Procedure", category: "Customer", agentId: "complaintRouter" },
  { id: "kb-products", name: "Retail Product Catalog", category: "Products", agentId: "nextBestOffer" },
  { id: "kb-collections", name: "Early Collections Script Library", category: "Lending", agentId: "collectionsNudge" },
  { id: "kb-cash", name: "Vault and ATM Cash Limits", category: "Operations", agentId: "cashForecaster" },
  { id: "kb-disputes", name: "Card Dispute Rules", category: "Payments", agentId: "cardDisputeTriage" },
  { id: "kb-audit", name: "Branch Audit Checklist", category: "Audit", agentId: "branchAuditPrep" },
];

export function getKnowledge(branch: Branch): BranchKnowledge[] {
  const rand = seeded(`${branch.id}-knowledge`);
  const agentIds = new Set(branch.agents.map((a) => a.agentId));

  return KNOWLEDGE_BASES.filter((kb) => agentIds.has(kb.agentId)).map((kb) => {
    const roll = rand();
    const access: AccessStatus = roll > 0.86 ? "Pending" : roll > 0.72 ? "Restricted" : "Granted";
    return { ...kb, access };
  });
}
