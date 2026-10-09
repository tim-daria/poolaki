/** @file Report types and API calls for the yearly financial overview. */

export interface MonthlyReport {
  month: number;
  income: string;
  expense: string;
}

export interface CategoryReport {
  category_id: number;
  name: string;
  type: "income" | "expense";
  total: string;
  monthly: string[];
}

export interface YearlyReportResponse {
  year: number;
  totals: {
    income: string;
    expense: string;
  };
  monthly: MonthlyReport[];
  categories: CategoryReport[];
}

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