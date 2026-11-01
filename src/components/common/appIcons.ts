import {
  BookOpen,
  Coins,
  CreditCard,
  FileText,
  LayoutDashboard,
  Layers,
  MessagesSquare,
  Scale,
  ScanSearch,
  UserRoundSearch,
  type LucideIcon,
} from "lucide-react";
import type { AppId } from "../../types";

export const APP_ICONS: Record<AppId, LucideIcon> = {
  customer360: UserRoundSearch,
  knowledgeRag: BookOpen,
  loansOrigination: Layers,
  branchOperations: LayoutDashboard,
  tradeFinance: FileText,
  amlMonitor: ScanSearch,
  cardsManagement: CreditCard,
  cashManagement: Coins,
  complaintDesk: MessagesSquare,
  shariahDesk: Scale,
};
