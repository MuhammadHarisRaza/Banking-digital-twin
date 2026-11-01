import type { Agent } from "../types";

export const AGENTS: Record<string, Agent> = {
  tellerAssist: {
    id: "tellerAssist",
    name: "Teller Assist",
    purpose: "Guides tellers through transaction exceptions and limits",
    appId: "branchOperations",
  },
  policyCopilot: {
    id: "policyCopilot",
    name: "Policy Copilot",
    purpose: "Answers staff questions from approved policy documents",
    appId: "knowledgeRag",
  },
  creditPreScreen: {
    id: "creditPreScreen",
    name: "Credit Pre-Screen",
    purpose: "Checks loan applications for completeness before review",
    appId: "loansOrigination",
  },
  queueOptimizer: {
    id: "queueOptimizer",
    name: "Queue Optimizer",
    purpose: "Forecasts walk-in demand and suggests counter staffing",
    appId: "branchOperations",
  },
  kycVerifier: {
    id: "kycVerifier",
    name: "KYC Verifier",
    purpose: "Pre-checks onboarding documents for a human reviewer",
    appId: "customer360",
  },
  amlSentinel: {
    id: "amlSentinel",
    name: "AML Sentinel",
    purpose: "Flags unusual transaction patterns for compliance review",
    appId: "amlMonitor",
  },
  tradeDocsChecker: {
    id: "tradeDocsChecker",
    name: "Trade Docs Checker",
    purpose: "Compares trade documents against letter of credit terms",
    appId: "tradeFinance",
  },
  shariahAdvisor: {
    id: "shariahAdvisor",
    name: "Shariah Advisor",
    purpose: "Checks Islamic product queries against approved rulings",
    appId: "shariahDesk",
  },
  complaintRouter: {
    id: "complaintRouter",
    name: "Complaint Router",
    purpose: "Classifies complaints and routes them to the right desk",
    appId: "customer360",
  },
  nextBestOffer: {
    id: "nextBestOffer",
    name: "Next Best Offer",
    purpose: "Suggests relevant products for relationship managers",
    appId: "customer360",
  },
  collectionsNudge: {
    id: "collectionsNudge",
    name: "Collections Nudge",
    purpose: "Prioritizes overdue accounts for early follow-up",
    appId: "loansOrigination",
  },
  cashForecaster: {
    id: "cashForecaster",
    name: "Cash Forecaster",
    purpose: "Forecasts vault and ATM cash needs for the week",
    appId: "cashManagement",
  },
  cardDisputeTriage: {
    id: "cardDisputeTriage",
    name: "Card Dispute Triage",
    purpose: "Sorts card disputes by type, value and deadline",
    appId: "cardsManagement",
  },
  branchAuditPrep: {
    id: "branchAuditPrep",
    name: "Audit Prep",
    purpose: "Collects branch evidence ahead of internal audits",
    appId: "branchOperations",
  },
};
