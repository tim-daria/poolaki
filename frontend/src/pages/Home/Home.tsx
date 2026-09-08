/** @file Workspace landing page: greeting or member list, plus the overview. */

import { useState } from "react";
import styles from "./styles.module.css";
import { Box, Button, Stack, Typography } from "@mui/material";
import { useCurrentOrg } from "../../context/useCurrentOrg";
import {
  PageHeading,
  PageTitle,
  PageActionButton,
} from "../../components/PageHeader/PageHeader";
import { OrgMembers } from "../../components/OrgMembers/OrgMembers";
import { Money } from "../../components/Money";
import { MoneyField } from "../../components/Form/MoneyField/MoneyField";
import { displayAmount, parsePastedAmount } from "../../lib/money";

// TEMP: paste samples for the MoneyField smoke test. Remove before merging.
const PASTE_SAMPLES = [
  "1.234,56",
  "1,234.56",
  "1.234",
  "1,234",
  "1.234.567",
  "€ 12,5",
  "$ 0.999",
  "-5",
  "abc",
  "1234567890123",
];

function greeting(hour: number) {
  if (hour < 12) return "Good Morning!";
  if (hour < 18) return "Good Afternoon!";
  return "Good Evening!";
}

export function Home() {
  const org = useCurrentOrg();
  const now = new Date();

  // TEMP: MoneyField / Money smoke test. Remove before merging.
  const [amountDe, setAmountDe] = useState("1234.5");
  const [amountUs, setAmountUs] = useState("");

  return (
    <Box className={styles.homeContainer}>
      {/* Personal workspaces have no members, so they show a greeting instead. */}
      {org.is_personal ? (
        <PageTitle
          title={greeting(now.getHours())}
          subtitle={now.toLocaleDateString(undefined, {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        />
      ) : (
        <PageHeading>
          <OrgMembers />
        </PageHeading>
      )}
      <PageActionButton onClick={() => {}}>Add transaction</PageActionButton>

      <Typography variant="h1">{org.name}'s Overview</Typography>

      {/* TEMP: MoneyField / Money smoke test. Remove before merging. */}
      <Stack spacing={2} sx={{ maxWidth: 360, mt: 3 }}>
        <MoneyField
          label="Amount (de)"
          value={amountDe}
          onChange={setAmountDe}
        />
        <MoneyField
          label="Amount (us)"
          locale="us"
          value={amountUs}
          onChange={setAmountUs}
        />
        <Typography>
          Input got in de field: <Money>{amountDe || "—"}</Money>
        </Typography>
        <Typography>
          Input got in us field: <Money>{amountUs || "—"}</Money>
        </Typography>
        <Typography variant="subtitle2">
          Paste samples (click to copy, then paste into a field above):
        </Typography>
        {PASTE_SAMPLES.map((sample) => (
          <Stack
            key={sample}
            direction="row"
            spacing={2}
            sx={{ alignItems: "center" }}
          >
            <Button
              size="small"
              variant="outlined"
              sx={{ minWidth: 140, justifyContent: "flex-start" }}
              onClick={() => navigator.clipboard.writeText(sample)}
            >
              <Money>{sample}</Money>
            </Button>
            <Typography variant="body2">
              de → <Money>{parsePastedAmount(sample, "de") ?? "null"}</Money>
              {" · "}
              us → <Money>{parsePastedAmount(sample, "us") ?? "null"}</Money>
            </Typography>
          </Stack>
        ))}
        <Typography variant="h3">
          Balance:{" "}
          <Money sx={{ color: "success.main" }}>
            {displayAmount(1234567.89)} €
          </Money>
        </Typography>
        <Typography variant="body2">
          Expense:{" "}
          <Money sx={{ color: "error.main" }}>-{displayAmount(42.5)} €</Money>
        </Typography>
      </Stack>
    </Box>
  );
}

// Named export required by react-router's route-level `lazy`.
export { Home as Component };
