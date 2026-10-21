/** @file The workspace's pages, as both the header tabs and the mobile bottom bar list them. */

import type { ReactNode } from "react";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import SyncAltOutlinedIcon from "@mui/icons-material/SyncAltOutlined";
import SavingsOutlinedIcon from "@mui/icons-material/SavingsOutlined";
import BarChartOutlinedIcon from "@mui/icons-material/BarChartOutlined";

export interface NavItemDef {
  label: string;
  /** Relative, so it resolves against /o/:orgId without threading orgId through props. */
  to: string;
  /** Match this path exactly; needed for the index route. */
  end?: boolean;
  icon: ReactNode;
}

export const NAV_ITEMS: NavItemDef[] = [
  // `end` stops "." from matching every route under /o/:orgId.
  { label: "Home", to: ".", end: true, icon: <DashboardOutlinedIcon /> },
  { label: "Transactions", to: "transactions", icon: <SyncAltOutlinedIcon /> },
  { label: "Savings", to: "savings", icon: <SavingsOutlinedIcon /> },
  { label: "Reports", to: "reports", icon: <BarChartOutlinedIcon /> },
];

/** Absolute paths: these live at the app root, not under /o/:orgId. */
export const LEGAL_LINKS = [
  { to: "/terms", label: "Terms of Use" },
  { to: "/policy", label: "Privacy Policy" },
];
