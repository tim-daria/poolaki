/** @file Net balance card: the workspace's spendable funds, or how to add some when there are none. */

import { Link, Typography } from "@mui/material";
import { Money } from "../../components/Money";
import { displayAmount } from "../../lib/money";
import { ComingSoon } from "../../components/Settings/SettingsCard";
import { CAN_SET_SHARED_STARTING_BALANCE } from "../../lib/initialBalance";
import { HomeCard } from "./HomeCard";

interface Props {
  balance: number;
  /** Only the personal workspace has a starting-balance endpoint so far. */
  isPersonal: boolean;
  onSetStartingBalance: () => void;
  onAddIncome: () => void;
}

// `font` first: the shorthand resets the weight set after it.
const actionLinkSx = {
  font: "inherit",
  fontWeight: 700,
  color: "primary.dark",
  verticalAlign: "baseline",
} as const;

export function NetBalanceCard({
  balance,
  isPersonal,
  onSetStartingBalance,
  onAddIncome,
}: Props) {
  const empty = balance === 0;
  const canSetStartingBalance = isPersonal || CAN_SET_SHARED_STARTING_BALANCE;

  return (
    <HomeCard title="Net Balance">
      <Money
        sx={{
          fontSize: { xs: "2.25rem", sm: "2.75rem" },
          fontWeight: 500,
          lineHeight: 1.1,
          whiteSpace: "nowrap",
          color: empty
            ? "text.disabled"
            : balance < 0
              ? "error.main"
              : "text.primary",
        }}
      >
        {balance < 0 && "-"}€{displayAmount(Math.abs(balance))}
      </Money>

      <Typography sx={{ color: "text.secondary", mt: empty ? 0 : "auto" }}>
        {!empty &&
          (balance > 0
            ? "Funds on your account available to spend"
            : "Spending has gone past the funds on your account")}
        {empty && (
          <>
            There are no available funds yet. You can{" "}
            <ComingSoon enabled={canSetStartingBalance}>
              <Link
                component="button"
                underline="hover"
                onClick={onSetStartingBalance}
                disabled={!canSetStartingBalance}
                sx={[
                  actionLinkSx,
                  {
                    "&:disabled": {
                      color: "text.disabled",
                      cursor: "default",
                      textDecoration: "none",
                    },
                  },
                ]}
              >
                set starting balance
              </Link>
            </ComingSoon>{" "}
            or{" "}
            <Link
              component="button"
              underline="hover"
              onClick={onAddIncome}
              sx={actionLinkSx}
            >
              add a new income
            </Link>
            .
          </>
        )}
      </Typography>
    </HomeCard>
  );
}
