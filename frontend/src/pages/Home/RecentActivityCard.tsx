/** @file Recent activity card: the latest entries, sized for five rows on desktop. */

import { Box, Button, Stack, Typography } from "@mui/material";
import {
  ROW_GAP,
  TransactionList,
  TransactionListItem,
} from "../../components/Transactions/TransactionListItem";
import type { Category } from "../../lib/categories";
import type { Goal } from "../../lib/goals";
import type { Transaction } from "../../lib/transactions";
import { HomeCard, HomeCardAction } from "./HomeCard";
import { DESKTOP } from "./layout";

interface Props {
  /** Newest first. */
  rows: Transaction[];
  categories: Category[];
  goals: Goal[];
  /** Adds the person column. */
  shared: boolean;
  onAdd: () => void;
}

export const RECENT_ROWS = 5;

/** A row's height: its two lines of text. */
const ROW_HEIGHT = 44;

/**
 * On desktop the list keeps the room of a full five rows whatever it holds,
 * and grows with the card when the sidebar beside it is taller: a full list
 * then spreads its rows into that room, a short one keeps its rhythm. A
 * phone card fits its rows.
 */
const listSx = {
  [DESKTOP]: {
    flex: 1,
    minHeight: RECENT_ROWS * ROW_HEIGHT + (RECENT_ROWS - 1) * ROW_GAP,
  },
} as const;

export function RecentActivityCard({
  rows,
  categories,
  goals,
  shared,
  onAdd,
}: Props) {
  if (rows.length === 0) {
    return (
      <HomeCard title="Recent activity">
        <Stack
          spacing={1}
          sx={[
            listSx,
            {
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
            },
          ]}
        >
          <Typography sx={{ fontWeight: 700, fontSize: "1.15rem" }}>
            No transactions yet
          </Typography>
          <Typography sx={{ color: "text.secondary", maxWidth: 480 }}>
            Add income and expenses as they happen to see where your money goes.
          </Typography>
          <Button
            variant="outlined"
            onClick={onAdd}
            sx={{
              mt: 1,
              minHeight: 44,
              fontWeight: 600,
              width: { xs: "100%", sm: "auto" },
            }}
          >
            Add transaction
          </Button>
        </Stack>
      </HomeCard>
    );
  }

  return (
    <HomeCard
      title="Recent activity"
      to="transactions"
      action={<HomeCardAction>See all</HomeCardAction>}
    >
      <Box sx={listSx}>
        <TransactionList
          withPerson={shared}
          sx={{
            height: "100%",
            alignContent:
              rows.length >= RECENT_ROWS ? "space-between" : "start",
          }}
        >
          {rows.slice(0, RECENT_ROWS).map((t) => (
            <TransactionListItem
              key={t.id}
              transaction={t}
              categories={categories}
              goals={goals}
              withPerson={shared}
            />
          ))}
        </TransactionList>
      </Box>
    </HomeCard>
  );
}
