/** @file Report types and API calls for the yearly financial overview. */

export interface MonthlyReport {
  month: number;
  income: string;
  expense: string;
  /** Contributions minus withdrawals in this month. */
  goals_balance: string;
}

export interface CategoryReport {
  category_id: number;
  name: string;
  type: "income" | "expense";
  total: string;
  monthly: string[];
}

/** Mirrors ReportGoalSerializer. */
export interface GoalReport {
  goal_id: number;
  name: string;
  status: "active" | "completed";
  target_amount: string;
  /** Contributions minus withdrawals within the requested year, not the all-time balance. */
  balance: string;
  /** Index 0 is January: the net transfers of each month, not a running balance. */
  monthly: string[];
}

export interface YearlyReportResponse {
  year: number;
  totals: {
    income: string;
    expense: string;
    /** Contributions minus withdrawals in the year. */
    goals_balance: string;
  };
  monthly: MonthlyReport[];
  categories: CategoryReport[];
  /** Net transfers in the current calendar month; ignores `year`. */
  goal_balance: string;
  goals: GoalReport[];
}

/** What Home's cards and the Reports page say when the report did not load. */
export const REPORT_UNAVAILABLE =
  "Couldn't load the report. Please try again later.";

/** GET /api/v1/organizations/${org_id}/reports/?year=${year} */
export async function fetchYearlyReport(
  org_id: number,
  year: number,
  signal?: AbortSignal,
): Promise<YearlyReportResponse> {
  const res = await fetch(
    `/api/v1/organizations/${org_id}/reports/?year=${year}`,
    {
      credentials: "include",
      signal,
    },
  );

  if (!res.ok) {
    throw new Error(`Failed to load yearly report (${res.status})`);
  }

  return res.json();
}
