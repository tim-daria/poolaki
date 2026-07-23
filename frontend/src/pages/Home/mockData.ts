export const mockUser = {
  name: "Lord Emperor",
};

interface MonthStats {
  label: string;
  income: number;
  expenses: number;
}

export const mockStats: { currentMonth: MonthStats; lastMonth: MonthStats } = {
  currentMonth: {
    label: "July 2026",
    income: 3850,
    expenses: 2200,
  },
  lastMonth: {
    label: "June 2026",
    income: 3540,
    expenses: 2310,
  },
};

export interface CategoryMeta {
  name: string;
  icon: string;
  color: string;
}

export const CATEGORY_META: CategoryMeta[] = [
  { name: "Entertainment", icon: "🎬", color: "#a855f7" },
  { name: "Food", icon: "🍔", color: "#f59e0b" },
  { name: "Freelance", icon: "💼", color: "#06b6d4" },
  { name: "Health", icon: "❤️", color: "#ef4444" },
  { name: "Housing", icon: "🏠", color: "#6366f1" },
  { name: "Salary", icon: "💰", color: "#10b981" },
  { name: "Shopping", icon: "🛍️", color: "#f97316" },
  { name: "Transport", icon: "🚌", color: "#3b82f6" },
  { name: "Utilities", icon: "⚡", color: "#84cc16" },
];

export const CATEGORIES = CATEGORY_META.map((c) => c.name);

export type TransactionType = "income" | "expense";

export interface Transaction {
  id: number;
  type: TransactionType;
  category: string;
  name: string;
  amount: number;
  date: string;
  recurring?: boolean;
  taxRefundable?: boolean;
}

export const mockTransactions: Transaction[] = [
  {
    id: 1,
    type: "income",
    category: "Salary",
    name: "Monthly salary",
    amount: 3500,
    date: "2026-07-01",
    recurring: true,
  },
  {
    id: 2,
    type: "expense",
    category: "Housing",
    name: "Rent",
    amount: 950,
    date: "2026-07-02",
    recurring: true,
  },
  {
    id: 3,
    type: "expense",
    category: "Food",
    name: "Grocery run",
    amount: 87.4,
    date: "2026-07-05",
  },
  {
    id: 4,
    type: "income",
    category: "Freelance",
    name: "Design project",
    amount: 350,
    date: "2026-07-10",
  },
  {
    id: 5,
    type: "expense",
    category: "Transport",
    name: "Monthly metro pass",
    amount: 49.9,
    date: "2026-07-12",
    recurring: true,
    taxRefundable: true,
  },
  {
    id: 6,
    type: "expense",
    category: "Food",
    name: "Coffee",
    amount: 3.5,
    date: "2026-07-13",
  },
  {
    id: 7,
    type: "expense",
    category: "Entertainment",
    name: "Netflix",
    amount: 12.99,
    date: "2026-07-13",
    recurring: true,
  },
  {
    id: 8,
    type: "expense",
    category: "Utilities",
    name: "Electricity bill",
    amount: 89.5,
    date: "2026-07-14",
    taxRefundable: true,
  },
  {
    id: 9,
    type: "expense",
    category: "Health",
    name: "Gym membership",
    amount: 29.9,
    date: "2026-07-14",
    recurring: true,
  },
  {
    id: 10,
    type: "expense",
    category: "Shopping",
    name: "IKEA",
    amount: 134.9,
    date: "2026-07-15",
  },
  {
    id: 11,
    type: "expense",
    category: "Food",
    name: "Restaurant",
    amount: 52,
    date: "2026-07-15",
  },
  {
    id: 12,
    type: "income",
    category: "Freelance",
    name: "Freelance payment",
    amount: 1200,
    date: "2026-07-16",
  },
  {
    id: 13,
    type: "expense",
    category: "Transport",
    name: "Bus pass",
    amount: 45,
    date: "2026-07-17",
    recurring: true,
  },
  {
    id: 14,
    type: "expense",
    category: "Food",
    name: "Supermarket",
    amount: 61.2,
    date: "2026-07-18",
  },
  {
    id: 15,
    type: "expense",
    category: "Shopping",
    name: "Clothes",
    amount: 78,
    date: "2026-07-19",
  },
];

export interface GoalContribution {
  date: string;
  amount: number;
}

export interface Goal {
  id: number;
  name: string;
  targetAmount: number;
  savedAmount: number;
  deadline: string;
  category: string;
  contributions: GoalContribution[];
}

export const mockGoals: Goal[] = [
  {
    id: 1,
    name: "Emergency Fund",
    targetAmount: 5000,
    savedAmount: 3200,
    deadline: "2026-12-31",
    category: "Utilities",
    contributions: [
      { date: "2026-04-28", amount: 500 },
      { date: "2026-05-15", amount: 300 },
      { date: "2026-05-30", amount: 200 },
    ],
  },
  {
    id: 2,
    name: "Japan Trip",
    targetAmount: 2400,
    savedAmount: 640,
    deadline: "2027-03-15",
    category: "Entertainment",
    contributions: [
      { date: "2026-05-01", amount: 200 },
      { date: "2026-06-01", amount: 200 },
      { date: "2026-07-01", amount: 240 },
    ],
  },
  {
    id: 3,
    name: "New Laptop",
    targetAmount: 1200,
    savedAmount: 480,
    deadline: "2026-09-30",
    category: "Shopping",
    contributions: [
      { date: "2026-05-10", amount: 150 },
      { date: "2026-06-10", amount: 150 },
      { date: "2026-07-10", amount: 180 },
    ],
  },
];
