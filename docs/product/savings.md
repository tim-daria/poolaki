---
document_id: savings
title: Savings & Goals
domain: product
language: en
version: 0
---

# Savings & Goals

## Definition

Savings are the money set aside toward a goal. A goal is the target: a dedicated financial purpose created by users, with a target amount and optional date. Money allocated to a goal is separated from the general available balance and tracked against the target amount.

## Properties

- **Name:** Required and unique within the workspace.
- **Target amount:** Required and greater than zero.
- **Target date:** Optional. When set, it must be today or a future date; it can be removed later.
- **Status:** Active, Completed, or Archived.
- **Creator:** The member who created the goal.

## Contributions

A contribution moves money from the general available balance into an active goal. It requires a goal; the Contribution category is applied automatically.

Contributions reduce the general available balance and increase the goal balance. Editing or deleting a contribution adjusts the goal balance accordingly.

## Withdrawals

A withdrawal moves money from an active goal back into the general available balance.

Archiving a goal also settles it: a positive balance is returned as a withdrawal named after the archived goal, and a negative balance is covered by a compensating contribution.

## Available Balance

The general available balance is the initial balance plus income, minus expenses, minus contributions, plus withdrawals. Goal balances stay outside it until the goal is archived.

## States and Rules

**Active:** The goal accepts contributions and withdrawals. It can also pay expenses only when it has no target date; a goal with a deadline cannot be spent from until it is completed.

**Completed:** A goal is completed manually from the goal form. Completed goals can pay expenses but cannot receive contributions or withdrawals. Completing sets a completion date; reverting to active clears it.

**Archived:** Archiving settles the goal balance and moves the goal to the archived section. Archived goals cannot be edited, receive contributions or withdrawals, or pay expenses.

## Progress, Overdue, and Off Limits

**Progress:** The saved balance divided by the target amount. Progress can exceed 100%, and a goal can be completed before or after reaching its target.

**Overdue:** An active goal that has not reached its target and whose target date has passed is marked overdue until it is completed, topped up, or given a new date.

**Off limits:** A goal whose balance is below zero, because expenses paid from it exceeded what it held. The card shows an "Off limits" chip, a negative amount, and the amount over the balance; progress reads 0%. A contribution clears the state, and the overdraft is settled when the goal is archived.

## Spending from Goals

Expenses can be paid from a goal when the goal is spendable: an active goal without a target date or a completed goal. Linking an expense deducts the amount from that goal instead of the general available balance.

## Permissions and Notifications

**Off limits:** A goal whose balance has gone below zero, because expenses paid from it exceeded what it held. The card marks it with an "Off limits" chip, a red negative amount and "Over by €X" in place of the deadline; its progress reads 0%. The general available balance does not reflect the overdraft while the goal is open: it is settled from the balance only when the goal is archived, as a contribution in the transactions list with an outlined "Overdraft" chip, a muted amount, "Overdraft settlement" under its name and an info icon explaining that it is not new spending. It does not count towards savings. Topping the goal up with a contribution clears the state earlier.

- Any member can contribute to or withdraw from an active goal. Each transfer is a transaction, so only its creator can edit or delete it.

- Only the goal creator or the workspace owner can edit a goal, change its status, or archive it.

- Archived goals are read-only for everyone.

- Goals cannot be deleted.

- Creating, completing, or archiving a goal notifies every other workspace member. Editing a goal or reverting it to active sends no notification.

- Contributions, withdrawals, and goal-linked expenses notify other members as transactions.

- A personal workspace has no other members to notify.

## Where Savings and Goals Appear

**Home Page:** Displays the active goal closest to completion, or a prompt to create the first goal.

**Savings Page:** Groups goals into Active, Completed, and Archived sections, with balances, progress, and the add, edit, contribute, withdraw, and archive actions.

**Transactions Page:** Lists contributions, withdrawals, and expenses linked to a goal.

**Reports Page:** Shows the amount set aside per month and a savings view grouped by goal for the selected year.

## Related Concepts

- Transactions
- Categories
- Reports
