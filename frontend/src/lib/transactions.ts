/**
 * @file Transaction types, mapping functions, and API calls.
 *
 * `fromDTO` and `toPayload` convert foreign key IDs (category_id, goal_id)
 * and string amounts to internal client models.
 */

import { TODAY } from "./date";
import {
  displayAmount,
  parseMoney,
  toMoneyString,
  validateAmount,
} from "./money";
import { formatName } from "./text";
import {
  PAGE_SIZE,
  type Tab,
  type TransactionFilters,
} from "./transactionFilters";
import { goalById, type Goal } from "./goals";

/** Contributions and withdrawals are transfers to or from a goal. */
export type EntryType = "income" | "expense" | "contribution" | "withdraw";

/** A transfer moves money between the balance and a goal, so it carries a goal and no category. */
export function isTransfer(entry_type: EntryType): boolean {
  return entry_type === "contribution" || entry_type === "withdraw";
}

/** The two entry types that are filed under a category. */
export type TransactionType = "income" | "expense";

export type TransactionPageFilters = TransactionFilters & { goal?: number };

export type Transaction = {
  id: number;
  entry_type: EntryType;
  /** Category ID. Null on transfers, and on rows whose category was removed. */
  category: number | null;
  /** Text label used for display and search. */
  description: string;
  amount: number;
  /** ISO date string: YYYY-MM-DD */
  transaction_date: string;
  is_tax_deductible: boolean;
  /** Goal ID. Only present on contributions. */
  goal: number | null;
  /** Creator's username; null once that account is deleted. */
  created_by: string | null;
};

/** Raw API shape, used only inside this module, mirrors the serializers.py. */
type TransactionDTO = {
  id: number;
  org_id: number;
  goal_id: number | null;
  category_id: number | null;
  entry_type: EntryType;
  /** String to preserve decimal precision. */
  amount: string;
  description: string | null;
  transaction_date: string;
  is_tax_deductible: boolean;
  /** Username, not an ID. */
  created_by: string | null;
  created_at: string;
};

/** Mirrors the GET response in TransactionListCreateView */
export type TransactionPage = {
  /** transactions -> rows */
  rows: Transaction[];
  total: number;
  page: number;
  page_count: number;
  counts: Record<Tab, number>;
};

/**
 * Maps raw API DTO to the internal Transaction model.
 * Maps fields explicitly to drop unused API keys (org_id, created_at).
 */
function fromDTO(d: TransactionDTO): Transaction {
  return {
    id: d.id,
    entry_type: d.entry_type,
    category: d.category_id,
    // Normalized so consumers can search it without null checks.
    description: d.description ?? "",
    amount: parseMoney(d.amount),
    transaction_date: d.transaction_date,
    is_tax_deductible: d.is_tax_deductible,
    goal: d.goal_id,
    created_by: d.created_by,
  };
}

/* ---------------------------------- */
/*             Form state             */
/* ---------------------------------- */

/**
 * Form state during user input.
 *
 * `amount` is a string to handle incomplete input (e.g. "12.").
 * `category` and `goal` requirements depend on `entry_type` (see validateDraft).
 */
export type TransactionDraft = {
  entry_type: EntryType;
  /**
   * Category ID. Null if unselected (forces explicit choice)
   * or if entry_type is contribution.
   */
  category: number | null;
  /** Goal ID. Required on a contribution, optional on an expense (paid from the goal), null on income. */
  goal: number | null;
  description: string;
  amount: string;
  transaction_date: string;
  is_tax_deductible: boolean;
};

/** Returns initial transaction form state. Defaults to "expense". */
export function emptyDraft(): TransactionDraft {
  return {
    entry_type: "expense",
    category: null,
    goal: null,
    description: "",
    amount: "",
    transaction_date: TODAY,
    is_tax_deductible: false,
  };
}

/** Add flow pre-set to a goal: the Saving tab with `goal` chosen and the direction set; everything else as emptyDraft. */
export function transferDraft(
  goal: number,
  direction: "contribution" | "withdraw",
): TransactionDraft {
  return changeType({ ...emptyDraft(), goal }, direction);
}

/**
 * A loaded row → form state, for the edit flow. Mirror image of emptyDraft.
 *
 * `amount` goes through toMoneyString, not String(): the draft holds a canonical
 * amount, so 49.9 must arrive as "49.90".
 */
export function toDraft(t: Transaction): TransactionDraft {
  return {
    entry_type: t.entry_type,
    category: t.category,
    goal: t.goal,
    description: t.description,
    amount: toMoneyString(t.amount),
    transaction_date: t.transaction_date,
    is_tax_deductible: t.is_tax_deductible,
  };
}

/**
 * Updates entry_type and resets incompatible fields (category, goal, tax deductible)
 * in a single update to prevent rendering or submitting invalid state. An
 * expense's goal is dropped too: "pay from a goal" is opted into per expense.
 */
export function changeType(
  draft: TransactionDraft,
  entry_type: EntryType,
): TransactionDraft {
  return {
    ...draft,
    entry_type,
    category: null,
    goal: isTransfer(entry_type) ? draft.goal : null,
    is_tax_deductible: entry_type === "expense" && draft.is_tax_deductible,
  };
}

/**
 * Validates draft before submission. Returns an error message or null.
 *
 * Checks rules HTML attributes cannot enforce: whitespace-only descriptions,
 * unselected values (null), and entry_type-specific requirements
 * (description and category for income/expense; goal for contribution).
 */
export function validateDraft(
  draft: TransactionDraft,
  goals: Goal[] = [],
): string | null {
  if (isTransfer(draft.entry_type)) {
    if (draft.entry_type === "withdraw") {
      const goal = goalById(goals, draft.goal);
      if (goal && Number(draft.amount) > goal.balance) {
        return `Only €${displayAmount(goal.balance)} is in this goal.`;
      }
    }
    if (draft.goal === null) return "Pick a goal.";
  } else {
    if (!draft.description.trim()) return "Description is required.";
    if (draft.category === null) return "Pick a category.";
  }
  // Validates presence and non-zero value.
  const amountProblem = validateAmount(draft.amount);
  if (amountProblem) return amountProblem;
  if (!draft.transaction_date) return "Pick a date.";
  return null;
}

/**
 * Draft → request body. Mirror image of fromDTO.
 *
 * `fallbackDescription` supplies the goal name when a contribution leaves the
 * optional description blank, so no row is stored unlabelled.
 */
function toPayload(draft: TransactionDraft, fallbackDescription = "") {
  // Normalised here rather than in the field, so what is stored is the same
  // whichever modal or flow sent it — see lib/text.ts.
  const description =
    formatName(draft.description) || formatName(fallbackDescription);
  return {
    entry_type: draft.entry_type,
    category_id: draft.category,
    goal_id: draft.goal,
    description,
    amount: toMoneyString(Number(draft.amount)),
    transaction_date: draft.transaction_date,
    is_tax_deductible: draft.is_tax_deductible,
  };
}

/** The subset of the request body that PATCH accepts: everything but the fixed entry_type and goal_id. */
function editableFields(p: ReturnType<typeof toPayload>) {
  return {
    category_id: p.category_id,
    description: p.description,
    amount: p.amount,
    transaction_date: p.transaction_date,
    is_tax_deductible: p.is_tax_deductible,
  };
}

/* ---------------------------------- */
/*                HTTP                */
/* ---------------------------------- */

/**
 * A 400 whose message belongs in the form, as opposed to a network or server
 * failure. Thrown by both create and delete.
 */
export class TransactionError extends Error {}

/** Wire field name → the label used for it in error messages. */
const FIELD_LABELS: Record<string, string> = {
  category_id: "Category",
  goal_id: "Goal",
  amount: "Amount",
  description: "Description",
  transaction_date: "Date",
  entry_type: "Type",
  is_tax_deductible: "Tax deductible",
};

/**
 * First error in a 400 body as a (field, message) pair; `field` is "" when the
 * body carries no field name.
 *
 * Handles the three shapes the API returns: {field: [message]},
 * {detail: message}, and a bare [message].
 */
function firstProblem(
  body: unknown,
  field = "",
): { field: string; message: string } | null {
  if (typeof body === "string") return { field, message: body };
  if (Array.isArray(body))
    return body.length ? firstProblem(body[0], field) : null;
  if (body && typeof body === "object") {
    for (const [key, value] of Object.entries(body)) {
      // Not form fields, so they must not be turned into a "Detail: …" prefix.
      const named = key === "detail" || key === "non_field_errors" ? "" : key;
      const problem = firstProblem(value, named);
      if (problem) return problem;
    }
  }
  return null;
}

/**
 * 400 body → one sentence for the form's error slot.
 *
 * Generic validation messages are rewritten because they describe the API
 * contract rather than the form; everything else is passed through with its
 * field named. Exported for tests only; callers go through the HTTP wrappers.
 */
export function describeProblem(body: unknown): string | null {
  const problem = firstProblem(body);
  if (!problem) return null;

  const { field, message } = problem;
  const label = FIELD_LABELS[field];

  // The ID sent does not exist server-side, so re-fetching the options is the
  // only action available to the user.
  if (message.startsWith("Invalid pk"))
    return `${label ?? "That choice"} is not available on the server. Reload the page and pick again.`;

  if (message.startsWith("This field is required"))
    return `${label ?? "A required field"} is missing.`;

  if (message.startsWith("This field may not be null"))
    return `${label ?? "A required field"} has to be set.`;

  if (message.startsWith("A valid number is required"))
    return `${label ?? "That value"} has to be a number.`;

  // Skip the prefix when the message already opens with the field name.
  if (label && !message.startsWith(label)) return `${label}: ${message}`;
  return message;
}

export interface TransactionQuery {
  /** Rows per page, newest first; the API caps it at 100. */
  pageSize?: number;
  /** Inclusive ISO date bounds. */
  from?: string;
  to?: string;
}

/** GET /api/v1/organizations/${org_id}/transactions/?… newest first. */
export async function fetchTransactions(
  org_id: number,
  query: TransactionQuery,
  signal?: AbortSignal,
): Promise<Transaction[]> {
  const params = new URLSearchParams();
  if (query.pageSize) params.set("page_size", String(query.pageSize));
  if (query.from) params.set("date_from", query.from);
  if (query.to) params.set("date_to", query.to);
  const res = await fetch(
    `/api/v1/organizations/${org_id}/transactions/?${params}`,
    { credentials: "include", signal },
  );
  if (!res.ok) throw new Error(`Failed to load transactions (${res.status})`);
  const data: { transactions: TransactionDTO[] } = await res.json();
  return data.transactions.map(fromDTO);
}

/** POST /api/v1/organizations/${org_id}/transactions/ */
export async function createTransaction(
  org_id: number,
  draft: TransactionDraft,
  csrfToken: string,
  fallbackDescription?: string,
): Promise<Transaction> {
  const res = await fetch(`/api/v1/organizations/${org_id}/transactions/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
    credentials: "include",
    body: JSON.stringify(toPayload(draft, fallbackDescription)),
  });
  if (res.status === 400) {
    const body = await res.json().catch(() => null);
    throw new TransactionError(
      describeProblem(body) ?? "Could not save the transaction",
    );
  }
  if (!res.ok) throw new Error(`Failed to create transaction (${res.status})`);
  return fromDTO(await res.json());
}

/**
 * PATCH /api/v1/organizations/${org_id}/transactions/${id}/
 *
 * Partial update of the editable fields. `entry_type` and `goal_id` are fixed
 * once a row exists (the backend ignores them on PATCH), so they are left out
 * of the body rather than sent and silently dropped.
 */
export async function updateTransaction(
  org_id: number,
  id: number,
  draft: TransactionDraft,
  csrfToken: string,
  fallbackDescription?: string,
): Promise<Transaction> {
  const res = await fetch(
    `/api/v1/organizations/${org_id}/transactions/${id}/`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
      credentials: "include",
      body: JSON.stringify(
        editableFields(toPayload(draft, fallbackDescription)),
      ),
    },
  );
  if (res.status === 400) {
    const body = await res.json().catch(() => null);
    throw new TransactionError(
      describeProblem(body) ?? "Could not save the transaction",
    );
  }
  if (res.status === 404)
    throw new TransactionError(
      "This transaction was added by someone else, or no longer exists",
    );
  if (!res.ok) throw new Error(`Failed to update transaction (${res.status})`);
  const body: { transaction: TransactionDTO } = await res.json();
  return fromDTO(body.transaction);
}

/** DELETE /api/v1/organizations/${org_id}/transactions/${id}/ */
export async function deleteTransaction(
  org_id: number,
  id: number,
  csrfToken: string,
): Promise<void> {
  const res = await fetch(
    `/api/v1/organizations/${org_id}/transactions/${id}/`,
    {
      method: "DELETE",
      headers: { "X-CSRFToken": csrfToken },
      credentials: "include",
    },
  );
  // Deletion can be refused (e.g. cancelling an income the balance cannot
  // cover), and that message is meant for the user.
  if (res.status === 400) {
    const body = await res.json().catch(() => null);
    throw new TransactionError(
      describeProblem(body) ?? "Could not delete the transaction",
    );
  }
  if (res.status === 404)
    throw new TransactionError(
      "This transaction was added by someone else, or no longer exists",
    );

  if (!res.ok) throw new Error(`Failed to delete transaction (${res.status})`);
}

/** GET /api/v1/organizations/${org_id}/transactions/?… */
export async function fetchTransactionPage(
  org_id: number,
  // `goal` is a caller-side filter: the Transactions page has no UI or URL
  // param for it, so it stays out of TransactionFilters.
  f: TransactionPageFilters,
  signal?: AbortSignal,
): Promise<TransactionPage> {
  const params = new URLSearchParams();
  // only set what differs from the backend's own defaults — keeps URLs short
  // and means a backend default change doesn't need a frontend release
  if (f.tab !== "all") params.set("entry_type", f.tab);
  if (f.q) params.set("q", f.q);
  if (f.sort !== "newest") params.set("sort", f.sort);
  if (f.from) params.set("date_from", f.from);
  if (f.to) params.set("date_to", f.to);
  if (f.categories.length) params.set("category_id", f.categories.join(","));
  if (f.members.length) params.set("created_by", f.members.join(","));
  if (f.taxDeductible) params.set("tax_deductible", "true");
  if (f.goal !== undefined) params.set("goal_id", String(f.goal));
  if (f.page > 1) {
    params.set("page", String(f.page));
    params.set("page_size", String(PAGE_SIZE));
  }

  const query = params.toString();
  const res = await fetch(
    `/api/v1/organizations/${org_id}/transactions/${query ? `?${query}` : ""}`,
    { credentials: "include", signal },
  );
  if (res.status === 400) {
    const body: unknown = await res.json().catch(() => null);
    throw new TransactionError(
      describeProblem(body) ?? "Could not load transactions",
    );
  }
  if (!res.ok) throw new Error(`Failed to load transactions (${res.status})`);

  const data: {
    transactions: TransactionDTO[];
    total: number;
    page: number;
    page_count: number;
    counts: Record<Tab, number>;
  } = await res.json();

  return {
    rows: data.transactions.map(fromDTO),
    total: data.total,
    page: data.page,
    page_count: data.page_count,
    counts: data.counts,
  };
}

/**
 * Every contribution and withdrawal dated in `year`, across pages.
 * Savings figures are derived from these rows; the report has no transfer sums.
 */
export async function fetchYearTransfers(
  org_id: number,
  year: number,
  signal?: AbortSignal,
): Promise<Transaction[]> {
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;
  const [contributions, withdrawals] = await Promise.all([
    fetchAllOfType(org_id, "contribution", from, to, signal),
    fetchAllOfType(org_id, "withdraw", from, to, signal),
  ]);
  return [...contributions, ...withdrawals];
}

/** The API's page cap. */
const TRANSFER_PAGE_SIZE = 100;

/** Every page of one entry type within the date range. */
async function fetchAllOfType(
  org_id: number,
  entry_type: "contribution" | "withdraw",
  from: string,
  to: string,
  signal?: AbortSignal,
): Promise<Transaction[]> {
  const rows: Transaction[] = [];
  let page = 1;
  let pageCount: number;
  do {
    const params = new URLSearchParams({
      entry_type,
      date_from: from,
      date_to: to,
      page_size: String(TRANSFER_PAGE_SIZE),
      page: String(page),
    });
    const res = await fetch(
      `/api/v1/organizations/${org_id}/transactions/?${params}`,
      { credentials: "include", signal },
    );
    if (!res.ok) throw new Error(`Failed to load transfers (${res.status})`);
    const data: { transactions: TransactionDTO[]; page_count: number } =
      await res.json();
    rows.push(...data.transactions.map(fromDTO));
    pageCount = data.page_count;
    page += 1;
  } while (page <= pageCount);
  return rows;
}
