import { seeded } from "../lib/seeded";
import type { ActivityEvent, ActivityKind, Branch } from "../types";

const TEMPLATES: [ActivityKind, string, (b: Branch) => string][] = [
  ["transaction", "End-of-day cash position balanced", () => "Vault and teller totals reconciled"],
  ["agent", "Agent recommendation accepted", (b) => `${b.agents.length} active agent workflow${b.agents.length === 1 ? "" : "s"} reviewed`],
  ["people", "Shift handover completed", (b) => `${Math.ceil(b.staff * 0.4)} staff signed in for the afternoon shift`],
  ["system", "Application health check passed", (b) => `${b.applications.length} connected applications responding`],
  ["compliance", "Daily compliance checklist filed", () => "No exceptions raised"],
  ["transaction", "Peak-hour transaction volume reached", (b) => `${Math.round(b.dailyTransactions * 0.12)} transactions in one hour`],
  ["system", "ATM cash replenishment confirmed", () => "On-site machine restocked and tested"],
  ["people", "Service quality coaching held", () => "Customer service team session recorded"],
  ["compliance", "KYC refresh batch reviewed", (b) => `${Math.round(b.activeCustomers * 0.003)} account files checked`],
  ["transaction", "Clearing batch submitted", () => "Inward and outward instruments cleared"],
  ["agent", "Agent output sampled by supervisor", () => "Quality review logged with no corrections"],
  ["system", "Backup connectivity tested", () => "Failover link switched and restored"],
];

export function getActivity(branch: Branch): ActivityEvent[] {
  const rand = seeded(`${branch.id}-activity`);
  let minutes = 16 * 60 + 40;

  return TEMPLATES.map(([kind, title, detail], i) => {
    minutes -= 25 + Math.floor(rand() * 45);
    const day = minutes < 9 * 60 ? "Yesterday" : "Today";
    const clock = minutes < 9 * 60 ? minutes + 8 * 60 : minutes;
    const hh = String(Math.floor(clock / 60)).padStart(2, "0");
    const mm = String(clock % 60).padStart(2, "0");
    return { id: `${branch.id}-${i}`, kind, title, detail: detail(branch), time: `${day}, ${hh}:${mm}` };
  });
}
