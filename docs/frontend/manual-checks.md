# Manual checks

A pass by hand over every user-facing flow of the app. Run it before a
release, and after a change that the Playwright suite cannot judge: how a
page looks, native date pickers, print, phone layout, Safari. The suite
covers the same flows on Chromium and Firefox and asserts roles, names and
copy, not appearance (see [playwright.md](playwright.md)). Which browsers to
run this on, and the Safari rule, are in
[browser-support.md](browser-support.md).

Labels and messages below are quoted as the app renders them, so a tester
can look for them verbatim. If the screen says something else, the doc is
stale: fix the doc, not the test.

---

## Before you start

- The local stack is up (`make`) and <http://poolaki.localhost:8080> answers.
  Safari only on `https://poolaki.de`, see browser-support.md.
- Two fresh accounts: **A** (creates the shared workspace, becomes owner) and
  **B** (invited member). Use a second browser or a private window for B.
  Signup is limited to 20 per minute per IP.
- A shared workspace with both members, plus A's personal workspace.
- The AI assistant needs `LLM_BASE_URL` in `.env` to point at a model. Without
  it the drawer shows "The assistant is unavailable right now. Please try
  again in a moment.", and that is the expected result on the local stack.
- DevTools console open. The only acceptable output is listed under
  [production-build.md](production-build.md) ("Known").

Run the list once per browser at desktop width, then repeat section 12 at
phone width (390 px). Log anything off as an issue with browser and width.
Record the run in the table at the end.

---

## 1. Sign up, sign in, sign out

1. `/register`: Email, Username, Password, Confirm password are all required;
   the browser blocks submit while one is blank.
2. Different passwords show "Passwords do not match" before any request.
3. A password under 8 characters, all digits, or a common one ("password")
   is rejected with its own message from the server.
4. An email or username already taken shows "This email is already in use."
   or the username equivalent.
5. Successful signup lands on `/` and then on the personal workspace.
6. `/login`: sign in with the username, sign out, sign in with the email.
   The field lowercases as you type.
7. Wrong password shows "Incorrect username/email or password." or
   "Incorrect password."; an unknown name shows "No account exists with that
   username or email."
8. "Login with 42" and "Sign up with 42" leave for 42 and return through
   `/oauth-callback` ("Checking your 42 account…"). Cancelling on 42 returns
   to `/login` with "The 42 authorization was cancelled." Without the
   provider configured the alert reads "Signing in with 42 failed…".
9. The legal notice under the card links to Terms of Use and Privacy Policy.
10. Signed in, open `/login`: the page says you are already signed in and
    offers to continue; `/register` behaves the same.
11. Signed out, open `/o/1/transactions`: redirected to `/login`.
12. Logout from the account menu (avatar, "Logout"). Back button afterwards
    shows no data.

---

## 2. Home

1. Title: "Good Morning!", "Good Afternoon!" or "Good Evening!" by the clock,
   with today's long date. A shared workspace shows member avatars instead,
   usernames on hover, "(invited)" on pending ones.
2. New personal workspace: "Set up your workspace" banner lists Set starting
   balance, Add your first transaction, Create a savings goal with "n of 3
   done". Each step opens its form; done steps get a check and strikethrough;
   "Dismiss setup" hides the banner and it stays hidden after reload.
3. "Set starting balance": "0,00" placeholder, zero allowed, toast "Starting
   balance saved", the balance card updates.
4. Balance card: "Available to spend" and the change since the 1st of the
   month. A balance below zero is red with "Below zero: more went out than you
   had". A very long figure shrinks, then abbreviates with the full amount
   underneath.
5. Month card: "Came in", "Spent", "Total in goals". Info icon tooltip "What
   this shows" (1rem icon, centred in the row). Footer reads "Nothing this
   month yet" on an empty month and a signed summary otherwise.
6. "Recent activity": up to 5 rows, "See all" opens Transactions. Empty: "No
   transactions yet" with an "Add transaction" button.
7. "Top spending": three categories plus "Other" as a donut; "See all" opens
   Reports. Empty: "No spending yet. Categories appear here as you add
   expenses."
8. Goal card: the active goal closest to its target, "Almost there", "Goal
   reached" or "Ready to use"; action "Manage" with one goal, "All goals" with
   more. Empty: "Create a goal".
9. The page action "Add transaction" opens the form; after saving, balance,
   recent activity and the month card refresh without a reload.

---

## 3. Workspaces

1. The switcher in the header lists the personal workspace and every shared
   one; the full name shows on hover; long names truncate without overflow.
2. "Create shared workspace…": blank name shows "Please enter a workspace
   name"; the Name counter stops at 100; a bad "Initial balance (€)" shows
   "Please enter a valid amount". Success toasts `Workspace "…" created` and
   lands in the new workspace.
3. Closing the create form with text in it asks "Discard changes?" with
   Discard and Keep editing.
4. Switching changes the URL to `/o/<id>`, keeps the header, and resets the
   Transactions filters and page.
5. Paste `/o/999` or `/o/abc`: "Workspace unavailable" with a link home and no
   redirect loop. Paste a deep link to a page you may see: it opens there
   after "Loading…".
6. Two tabs on two workspaces: each keeps its own; adding a row in one does not
   change the other until it reloads.
7. With 10 workspaces, "Create shared workspace…" and the create action in
   Settings are disabled with "Up to 10 workspaces".
8. Stop the backend and reload: "Couldn't load your workspaces" with Retry,
   which reads "Retrying…" while it runs.

---

## 4. Members and invitations

Two browsers: A owns the shared workspace, B is invited.

1. A, workspace settings, "Invite a member": blank username shows "Please
   enter a username"; an unknown user, yourself, or a current member shows the
   server's message; success toasts "Invitation sent to <name>" and a row
   "Invited · not answered yet" appears.
2. "Cancel invitation?" asks Cancel invitation / Keep; the toast reads
   "Invitation to <user> cancelled", the row and B's notification go.
3. B: the invitation appears in the bell (Accept / Decline) and in Settings as
   a collapsible banner with a count chip ("Hide invitations"). Accept toasts
   "Joined <name>" and the workspace appears in B's switcher; Decline toasts
   "Invitation declined".
4. Accepting an invitation the owner already cancelled shows an error, not a
   blank panel.
5. Members card on Home shows both avatars; the invite button vanishes at 5
   members, and "Invite" in settings is disabled with "Up to 5 members".
6. A: "Manage <user>" menu, "Remove from workspace", confirm "Remove member?"
   with Remove / Keep; toast "<user> removed from <name>". B gets a
   notification and the workspace leaves B's switcher; B on that workspace's page sees "Workspace unavailable".
7. B: "Leave workspace", button "Quit", dialog "Leave <name>?" with Leave /
   Stay. B lands on another workspace; A gets "<B> left <name>".
8. A leaves with B still in: the dialog names B as the next owner; B gets
   "Ownership of <name> was passed to you" and now sees owner-only controls.
9. The last member leaving deletes the workspace; pending invitees get the
   "was deleted after … left" notification.
10. "Delete workspace": a sole owner gets "Delete <name>?" with Delete / Keep;
    with other members the button is disabled ("coming soon").
11. The personal workspace has no Members card, no Quit and no Delete.

---

## 5. Notifications

1. The bell shows a red dot when something is unread; the badge count matches
   the rows marked unread in the panel.
2. The panel opens from the bell, and from the account menu "Notifications" on
   phones. Filter toggle "All" / "Invitations (n)". Empty text "No
   notifications to display".
3. "Mark all as read" (reads "Marking…") clears every unread row except
   invitations and is disabled when only invitations are pending. Closing the
   panel marks nothing.
4. B adds a transaction in the shared workspace: A's dot appears within 60 s
   without any click. Accept, Decline and Mark all update the badge at once.
5. See each type once, worded as in
   [notifications.md](../backend/notifications.md): invitation, transaction
   added, goal created, goal completed, goal archived, member left, member
   removed, removed from org, ownership transferred, owner changed,
   organization deleted.
6. Backend down: "Couldn't load notifications - please try again".

---

## 6. Transactions

### The form

1. Opens from Home and from the page action. Type switch Expense / Income /
   Savings; Savings has a direction switch (Contribute / Withdraw) and the
   title follows it.
2. Expense and Income require a category ("Pick a category."); Savings
   requires a goal ("Pick a goal.") and sets the category itself. "Description
   is required." for expense and income, optional for transfers. "Pick a
   date.", "Enter an amount", "Enter a valid amount".
3. Amount: "1,5" and "1.5" both read 1,50; "0" and a minus sign are rejected;
   pasting "€ 1 234,56" parses in full; the field groups digits when it loses
   focus.
4. Date: the picker opens and selects (each engine draws its own); typed dates
   work too.
5. "Tax refundable" switch only on Expense.
6. "Pay from a goal" on an expense lists only active goals without a deadline
   and completed goals; the info icon states the rule; a split preview shows
   what the goal and the balance each cover.
7. Goal select shows "€X of €Y saved" per goal, "No goals yet." when empty, and
   "New goal…" opens a second sheet on top; the new goal is selected on return.
8. Toasts: "Transaction added", "Transaction updated", "Transaction deleted".
   Delete asks "Delete this transaction?".
9. Edit: type and goal are locked with an explanation; "Save changes" stays
   disabled until a field changes; closing a dirty form asks "Discard
   changes?".
10. B opens one of A's rows: read-only, the only button is "Close".
11. A row on an archived goal: the amount is fixed and Delete is blocked, with
    the explanation under the goal. Deleting a contribution that would push the
    goal below zero is blocked with the shortfall.

### The list

12. Tabs All, Expenses, Income, Transfers, Withdrawals with count chips.
13. Search "Search name, category or member" matches description, category
    and the creator's username; stops at 100 characters.
14. Sort "Newest first" / "Oldest first".
15. Filters button with a count badge; a side drawer on desktop, a bottom sheet
    on phones that ends under its last row. Presets This month, Prev month,
    This year; From / To limit each other; Categories grouped Expenses /
    Income with their own "Clear"; Members (shared only); "Tax refundable";
    live match count; "Clear all"; "Close filters".
16. Active filters show as removable chips with "Clear all", which keeps the
    tab, search and sort.
17. The URL carries the filters: reload keeps them; the link pasted in another
    tab shows the same list; Back does not step through every chip.
18. Pagination appears above 15 rows with "Showing X of Y"; changing a filter
    returns to page 1; the list dims while a page loads.
19. Empty states: "No transactions yet." on a fresh workspace, "No
    transactions match these filters." with filters on.
20. An overdraft settlement row (see section 7) has an outlined "Overdraft"
    chip, a muted amount and an info icon.

---

## 7. Goals (the "Savings" tab)

1. Sections Active, Completed, Archived fold and unfold; Archived starts
   folded. Empty Active shows "Start a new goal".
2. "Add goal": Name (a duplicate is rejected), Target amount (zero rejected),
   Target date optional and not in the past, removable on edit. Toasts "Goal
   added", "Goal updated".
3. Card click: Contribute on an active goal, Edit on a completed one (info card
   for B, who may not edit), info card on an archived one. Opening the
   "Actions for <name>" menu does not trigger the card.
4. Menu: Contribute, Withdraw, Show info, and Edit for the creator or the
   owner only. Withdraw caps the amount at what the goal holds.
5. Progress and the "Target reached" chip; a passed deadline turns red with
   "Overdue"; after the target date is removed the flag goes.
6. Pay an expense from a deadline-free goal above its balance: "Off limits"
   chip, red negative amount, "Over by €X", progress 0 %. A contribution
   clears it.
7. Edit, "Mark as completed": the goal moves to Completed, can pay expenses,
   and Contribute / Withdraw are gone. Untick to revert.
8. Edit, "Archive" with its info tooltip, confirm "Archive this goal?". A
   positive balance returns as a withdrawal named after the goal; an off-limits
   goal produces the overdraft contribution. The archived card shows what it
   held.
9. Info card: saved amount, "€X to go" or "Target reached", activity lists with
   "Contributions will show up here." and "Expenses paid from this goal will
   show up here." when empty; "close" returns focus to the card.
10. A and B: B's contribution shows on A's card after reload and A gets the
    transaction notification; B cannot archive A's goal.

---

## 8. Reports

1. Year select "Year" in the heading lists every year from the oldest
   transaction to now, newest first; an empty year shows zeros everywhere.
2. Tiles Income, Expenses, "Set aside"; the exact amount is in the tooltip of
   an abbreviated figure.
3. "By month": toggle "Monthly view" between income and expenses and "Saved
   per month"; legend, average line and bar tooltips.
4. "Categories": toggle "Category view" Expenses / Income / Savings; Savings is
   titled "Saved per goal in <year>"; "No data available for this view." when
   empty. The donut keeps its size in Safari.
5. Print is disabled until the data loads. Print preview: its own heading, no
   card cut in two, the categories card on a new page, both charts drawn.
   Chrome's `[Violation] 'click' handler` on Print is expected.
6. Backend down: "Couldn't load the report. Please try again later." on
   Reports; on Home only the month and top-spending cards show it and the rest
   renders.

---

## 9. AI assistant

1. "Ask AI" in the header on every page except the two Settings pages.
2. Drawer titled "AI Assistant": side panel on desktop, a full-height sheet on
   phones with the input at the bottom. Empty text "Ask about your
   transactions, goals or budget."
3. Enter sends, Shift+Enter adds a line, Send button; an empty question says
   "Ask something first."; over 1000 characters is refused.
4. A reply renders as Markdown (lists, bold). A second question does not rely
   on the first.
5. Six messages in a minute: "You are asking the assistant too fast. Wait a
   moment and try again."
6. No model: "The assistant is unavailable right now. Please try again in a
   moment."
7. "Close assistant" clears the conversation and focus returns to the "Ask AI"
   button. Switching workspace while open starts an empty conversation.

---

## 10. Settings

1. Profile card: avatar initials, username, email. "Edit profile" and "Delete
   account" are disabled "coming soon" buttons and do nothing.
2. "Change password": blank fields are blocked; "New passwords don't match.";
   wrong current password "Incorrect current password."; short, numeric or
   common new password each get their message; success toasts "Password
   changed". Sign out and in with the new password. A 42-only account has no
   current-password field.
3. Closing the password form with input asks "Discard changes?".
4. Footer links Terms of Use and Privacy Policy.
5. "Workspaces" card: one row each with "Personal · only you" or the member
   summary; a row opens `/o/<id>/settings/workspaces/<id>`, whose "Settings"
   link goes back.
6. Workspace page: "Workspace name" and Rename (owner only): blank name shows
   "Please enter a workspace name"; toast `Workspace renamed to "…"`; the
   switcher and the title update; closing with input asks "Discard changes?".

---

## 11. Legal pages and errors

1. `/terms` and `/policy` open signed in and signed out; sections fold on
   click; "Back to Homepage" works in both states; the terms link to the
   policy; the policy's mail links open the mail client.
2. `/nothing-here`: "Page not found" with "Back to home".
3. "Something went wrong" for an unexpected error, with the same button.

---

## 12. Layout, phones and keyboard

Resize to 390 px wide, then repeat the main actions of sections 2, 6, 7 and 9.

1. Below 980 px: the tabs leave the header and a bottom bar "Workspace pages"
   shows Home, Transactions, Savings, Reports; the account menu holds
   Notifications, Settings, Logout.
2. The page action becomes a floating button that collapses to a circle while
   scrolling down and grows back on the way up.
3. Forms open as bottom sheets with rounded top corners, never taller than
   85 % of the viewport, a strip of the page visible above. Filters, goal info
   and forms end under their content on a tablet; the chat always fills.
4. Confirm and discard dialogs stay centred and sit above the sheet.
5. Showing and hiding the browser's address bar leaves no gap under the
   sheet.
6. Above 980 px: tabs in the header, forms as centred dialogs, drawers from
   the right.
7. Toasts: one at a time, bottom right, gone after 4 s, the X closes it, a
   click on the page does not. Two in a row (rename, then cancel an
   invitation) each stay their full time.
8. Keyboard: Tab reaches switcher, Ask AI, bell, avatar, tabs; Enter or Space
   opens a transaction row and a goal card; Esc closes drawers and dialogs;
   focus lands back on the opener after the close animation; info icons in
   field labels are focusable and show their tooltip.
9. The browser tab title reads "<page> · Poolaki" and changes on every route.
10. Money everywhere: euro sign, dot thousands, comma decimals, abbreviation
    with the exact amount in the tooltip ([money.md](money.md)).
11. Console stays clean apart from the entries in production-build.md.

---

## 13. Two users at once

1. A and B add transactions in the shared workspace within seconds of each
   other; after reload both lists and both balances agree.
2. B is removed while B has the transaction form open: saving shows an error,
   not a blank page, and B then lands on "Workspace unavailable".
3. A renames the workspace while B is on it: B sees the new name after reload
   and nothing breaks before.

---

## Runs

| Browser | Width | Date | Tester | Result | Issues |
| ------- | ----- | ---- | ------ | ------ | ------ |
|         |       |      |        |        |        |
