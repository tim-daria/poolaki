# Supported AI Questions

Poolaki AI Assistant allows users to query their financial data using natural language.

The assistant supports the following domains:

- Expenses
- Income
- Balance
- Goals
- Recurring Transactions
- Analytics & Trends
- Shared Accounts

Data retrieval is mainly performed through backend services using SQL-based queries and analytics calculations. Vector retrieval is only used for semantic context when applicable.

The following are the initial supported questions for the MVP:

---

# Domain: Expenses & Transactions

## EXP-001 - Monthly Expenses

User Question:
> How much did I spend this month?

**Intent:**
Calculate total expenses for the current month.

Data Required:
- Transactions
- Categories

Retrieval:
`SQL` + Analytics (backend service)

Backend Endpoint:
`POST /api/internal/v1/analytics/monthly-summary`

Expected Response:
> "You spent €850 this month, mainly on Food and Transport."

---

## EXP-002 - Previous Month Expenses

User Question: 
> How much did I spend last month?

**Intent:**
Calculate total expenses for a previous period.

Data Required:
- Transactions

Retrieval:
`SQL` + Analytics

Backend Endpoint:
`POST /api/internal/v1/analytics/monthly-summary`

Expected Response:
> "You spent €720 last month."

---

## EXP-003 - Category Spending

User Question:
> How much did I spend on food?

**Intent:**
Calculate expenses by category.

Data Required:
- Transactions
- Categories

Retrieval: `SQL`

Backend Endpoint:
`POST /api/internal/v1/analytics/categories`

Expected Response:
> "You spent €230 on Food this month."

---

## EXP-004 - Biggest Expense Category

User Question:
> What is my biggest expense category?

**Intent:**
Find the highest spending category.

Data Required:
- Transactions
- Categories

Retrieval: `SQL` + Analytics (backend service)

Backend Endpoint:
`POST /api/internal/v1/analytics/categories/ranking`

Expected Response:
> "Your biggest expense category is Food (€230)."

---

## EXP-005 - Top Expenses

User Question:
> What are my top 5 expenses?

**Intent:**
List highest-value transactions.

Data Required:
- Transactions

Retrieval: `SQL`

Backend Endpoint:
`POST /api/internal/v1/transactions`

Expected Response:
> "A list of your five largest expenses."

---

## EXP-006 - Last Expense

User Question:
> When was the last time I made an expense?

**Intent:**
Find latest expense transaction.

Data Required:
- Transactions

Retrieval: `SQL`

Backend Endpoint:
`POST /api/internal/v1/transactions/latest`

Expected Response:
> "Your last expense was Netflix (€15) on June 15."

---

## EXP-007 - Largest Transaction

User Question:
> What was my largest transaction in the last 3 months?

**Intent:**
Find maximum transaction amount within a period.

Data Required:
- Transactions

Retrieval: `SQL`

Backend Endpoint:
`/api/internal/v1/transactions`

Expected Response:
> "Your largest transaction was €500 on June 2."


---

# Domain: Income

## INC-001 - Monthly Income

User Question:
> How much income did I receive this month?

**Intent:**
Calculate income during a period.

Data Required:
- Income transactions

Retrieval: `SQL` + Analytics

Backend Endpoint:
`POST /api/internal/v1/analytics/income-summary`

Expected Response:
> "You received €2200 this month."


---

## INC-002 - Average Income

User Question:
> What is my average monthly income?

**Intent:**
Calculate average income.

Data Required:
- Income transactions

Retrieval: `SQL` + Analytics

Backend Endpoint:
`POST /api/internal/v1/analytics/income-average`

Expected Response:
> "Your average monthly income is €2100."


---

# Domain: Balance

## BAL-001 - Current Balance

User Question:
> What is my current balance?

**Intent:**
Calculate current financial balance.

Data Required:
- Income
- Expenses

Retrieval: `SQL` + Analytics

Backend Endpoint:
`POST /api/internal/v1/analytics/balance`

Expected Response:
> "Your current balance is €3500."


---

# Domain: Goals

## GOAL-001 - Goal Progress

User Question:
> How much progress have I made toward my goal?

**Intent:**
Calculate goal completion.

Data Required:
- Goals
- Contributions

Retrieval: `SQL`

Backend Endpoint:
`POST /api/internal/v1/goals/progress`

Expected Response:
> "You have completed 60% of your savings goal."


---

## GOAL-002 - Remaining Goal Amount

User Question:
> How much is left to reach my goal?

**Intent:**
Calculate remaining amount.

Data Required:
- Goals

Retrieval: `SQL`

Backend Endpoint:
`POST /api/internal/v1/goals/progress`

Expected Response:
> "You need €400 more to reach your goal."


---

## GOAL-003 - Goal Completion Estimate

User Question:
> When will I reach my goal if I continue at this pace?

**Intent:**
Estimate completion date.

Data Required:
- Goals
- Saving history

Retrieval: `SQL` + Analytics

Backend Endpoint:
`POST /api/internal/v1/goals/forecast`

Expected Response:
> "You are expected to reach your goal in 4 months."

---

# Domain: Recurring Transactions

## REC-001 - Recurring Payments

User Question:
> What recurring payments do I have?

Retrieval: `SQL`

Backend Endpoint:
`POST /api/internal/v1/recurring-transactions`

Expected Response:
> "You have Netflix, Spotify and Rent as recurring payments."


---

## REC-002 - Monthly Recurring Cost

User Question:
> How much are my recurring transactions per month?

Retrieval: `SQL` + Analytics

Backend Endpoint:
`POST /api/internal/v1/analytics/recurring-summary`

Expected Response:
> "Your recurring payments total €250 per month."


---

## REC-003 - Next Month Expenses

User Question:
> How much will I spend next month?

Retrieval: `SQL` + Calculation

Backend Endpoint:
`POST /api/internal/v1/analytics/forecast-recurring`

Expected Response:
> "Your expected recurring expenses next month are €300."


---

# Domain: Trends & Analytics

## TREND-001 - Spending Comparison

User Question:
> Am I spending more or less than last month?

Retrieval: Analytics

Backend Endpoint:
`POST /api/internal/v1/analytics/trends`

Expected Response:
> "You spent 15% more than last month."


---

## TREND-002 - Cash Flow

User Question:
> What is my net cash flow this week?

Retrieval: Analytics

Backend Endpoint:
`POST /api/internal/v1/analytics/cash-flow`

Expected Response:
> "Your net cash flow this week is +€350."


---

# Domain: Shared Accounts

## SHARED-001 - Shared Expenses

User Question:
> What are our shared expenses this month?

Retrieval: `SQL` + Analytics

Backend Endpoint:
`POST /api/internal/v1/analytics/shared-expenses`

Expected Response:
> "Your household spent €1200 this month."


---

## SHARED-002 - Organization Spending

User Question:
> How much did we spend?

Retrieval: `SQL` + Analytics

Backend Endpoint:
`POST /api/internal/v1/analytics/organization-summary`

Expected Response:
> "Your organization spent €2500 this month."

---
# Domain: Product Knowledge & Semantic Understanding

## VEC-001 - Recurring Transaction Definition

User Question:
> What is a recurring transaction?

**Intent:**
Explain Poolaki financial concepts.

Data Required:
- Recurring transaction documentation
- Product knowledge base

Retrieval: `Vector`

Vector Source:
- Poolaki documentation
- Financial concepts glossary

Backend Endpoint: NA

Expected Response:
> "A recurring transaction is a payment or income that repeats automatically on a defined schedule, such as subscriptions or salary payments."

---

## VEC-002 - Category Explanation

User Question:
> What does this category mean?

**Intent:**
Explain transaction categories.

Data Required:
- Category descriptions

Retrieval: `Vector`

Vector Source:
- Category definitions
- Category metadata

Backend Endpoint: NA

Expected Response:
> "The Food category is used for expenses related to groceries, restaurants, and food delivery."

---

## VEC-003 - Transaction Category Suggestion

User Question:
> Which category should I use for this transaction?

**Intent:**
Suggest a category based on transaction information.

Data Required:
- Transaction description
- Category definitions

Retrieval: `Vector` + `SQL`

Backend Endpoint:
`POST /api/internal/v1/categories`

Vector Source:
- Category descriptions
- Categorization rules

Expected Response:
> "Based on the transaction description, this expense matches the Food category."

---

## VEC-004 - Poolaki Feature Explanation

User Question:
> What is the difference between a goal and a recurring transaction?

**Intent:**
Explain application concepts.

Data Required:
- Product documentation

Retrieval: `Vector`

Vector Source:
- Poolaki documentation

Backend Endpoint: NA

Expected Response:
> "A goal represents a target amount that users want to track, while a recurring transaction represents a repeated financial movement."


---

## VEC-005 - Category Assignment Explanation

User Question:
> Why was this transaction categorized as Transport?

**Intent:**
Explain categorization decisions.

Data Required:
- Transaction information
- Category definitions

Retrieval: `SQL` + `Vector`

Backend Endpoint:
`POST /api/internal/v1/transactions/detail`

Vector Source:
- Category definitions

Expected Response:
> "This transaction was categorized as Transport because its description matches transportation-related expenses."

---

## VEC-006 - Supported AI Capabilities

User Question:
> What information can I ask about my finances?

**Intent:**
Explain AI capabilities.

Data Required:
- AI assistant documentation

Retrieval: `Vector`

Vector Source:
- Supported questions documentation

Backend Endpoint: NA

Expected Response:
> "You can ask about expenses, income, goals, recurring transactions, and spending trends."
