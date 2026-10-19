/** @file Recent activity card: the latest entries, sized for five rows on desktop. */

import {
  Box,
  Button,
  Stack,
  Typography,
  type SxProps,
  type Theme,
} from "@mui/material";
import {
  ROW_GAP,
  TransactionList,
  TransactionListItem,
} from "../../components/Transactions/TransactionListItem";
import type { Category } from "../../lib/categories";
import type { Goal } from "../../lib/goals";
import type { Transaction } from "../../lib/transactions";
import { HomeCard, HomeCardAction } from "./HomeCard";
import { DESKTOP } from "../../lib/layout";

interface Props {
  /** Newest first, at most RECENT_ROWS: the caller limits via recentTransactions. */
  rows: Transaction[];
  categories: Category[];
  goals: Goal[];
  /** Adds the person column. */
  shared: boolean;
  onAdd: () => void;
  /** Placement in the page grid. */
  sx?: SxProps<Theme>;
}

export const RECENT_ROWS = 5;

/** A row's two lines: body1 and body2 line heights, in rem so it follows the root font. */
const ROW_HEIGHT = "2.75rem";

/**
 * On desktop the list keeps the room of a full five rows whatever it holds;
 * rows keep their rhythm from the top. A phone card fits its rows.
 */
const listSx = {
  [DESKTOP]: {
    flex: 1,
    minHeight: `calc(${RECENT_ROWS} * ${ROW_HEIGHT} + ${(RECENT_ROWS - 1) * ROW_GAP}px)`,
  },
} as const;

export function RecentActivityCard({
  rows,
  categories,
  goals,
  shared,
  onAdd,
  sx,
}: Props) {
  if (rows.length === 0) {
    return (
      <HomeCard title="Recent activity" sx={sx}>
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
      sx={sx}
      title="Recent activity"
      to="transactions"
      action={<HomeCardAction>See all</HomeCardAction>}
    >
      <Box sx={listSx}>
        <TransactionList withPerson={shared}>
          {rows.map((t) => (
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
