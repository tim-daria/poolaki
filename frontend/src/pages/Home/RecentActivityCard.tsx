/** @file Recent activity card: the latest entries, with their creator in shared workspaces. */

import { Link as RouterLink } from "react-router";
import {
  Box,
  Button,
  ButtonBase,
  Chip,
  Link,
  Stack,
  Typography,
} from "@mui/material";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import { Money } from "../../components/Money";
import type { Category } from "../../lib/categories";
import { fullDate } from "../../lib/date";
import { ENTRY_STYLE, entryCategoryLabel } from "../../lib/entryDisplay";
import { displayAmount } from "../../lib/money";
import type { Transaction } from "../../lib/transactions";
import { HomeCard, PlaceholderBar } from "./HomeCard";

interface Props {
  rows: Transaction[];
  categories: Category[];
  /** Adds the "by <username>" column. */
  shared: boolean;
  onOpen: (t: Transaction) => void;
  onAdd: () => void;
}

/**
 * One template for every row, so the chip, creator and amount line up as
 * columns. Below `sm` only the name and amount remain.
 */
function rowColumns(shared: boolean) {
  return {
    xs: "auto minmax(0, 1fr) auto",
    sm: shared
      ? "auto minmax(0, 1fr) 130px 120px 120px"
      : "auto minmax(0, 1fr) 130px 120px",
  };
}

const iconTileSx = {
  width: 44,
  height: 44,
  borderRadius: 2,
  display: "grid",
  placeItems: "center",
  bgcolor: "primary.light",
  color: "primary.dark",
} as const;

const hideOnPhone = { display: { xs: "none", sm: "flex" } } as const;

export function RecentActivityCard({
  rows,
  categories,
  shared,
  onOpen,
  onAdd,
}: Props) {
  const viewAll = (
    <Link
      component={RouterLink}
      to="transactions"
      underline="hover"
      sx={{ fontWeight: 600, color: "primary.dark" }}
    >
      View all →
    </Link>
  );

  if (rows.length === 0) {
    return (
      <HomeCard title="Recent Activity">
        <Stack spacing={2.5} aria-hidden>
          {/* Fading skeleton rows sketch what the list will look like. */}
          {[1, 0.6, 0.3].map((opacity) => (
            <Box
              key={opacity}
              sx={{
                display: "grid",
                gridTemplateColumns: rowColumns(false),
                alignItems: "center",
                columnGap: 2,
                opacity,
              }}
            >
              <Box sx={iconTileSx} />
              <Stack spacing={1}>
                <PlaceholderBar sx={{ width: "45%", maxWidth: 200 }} />
                <PlaceholderBar
                  sx={{ width: "25%", maxWidth: 110, height: 10 }}
                />
              </Stack>
              <PlaceholderBar sx={[hideOnPhone, { height: 44, width: 130 }]} />
              <PlaceholderBar
                sx={{ width: { xs: 70, sm: 100 }, justifySelf: "end" }}
              />
            </Box>
          ))}
        </Stack>
        <Stack
          spacing={1}
          sx={{ alignItems: "center", textAlign: "center", py: 2 }}
        >
          <Typography sx={{ fontWeight: 700 }}>Nothing here yet</Typography>
          <Typography sx={{ color: "text.secondary", maxWidth: 440 }}>
            Expenses, income and goal contributions show up here as you add
            them.
          </Typography>
          <Button
            variant="contained"
            onClick={onAdd}
            sx={{ mt: 1, fontWeight: 700 }}
          >
            Add your first transaction
          </Button>
        </Stack>
      </HomeCard>
    );
  }

  return (
    <HomeCard title="Recent Activity" aside={viewAll}>
      <Stack
        component="ul"
        spacing={0.5}
        sx={{ listStyle: "none", m: 0, p: 0 }}
      >
        {rows.map((t) => {
          const style = ENTRY_STYLE[t.entry_type];
          const category = entryCategoryLabel(t, categories);
          return (
            <li key={t.id}>
              <ButtonBase
                onClick={() => onOpen(t)}
                sx={{
                  width: "100%",
                  display: "grid",
                  gridTemplateColumns: rowColumns(shared),
                  alignItems: "center",
                  columnGap: 2,
                  textAlign: "left",
                  borderRadius: 2,
                  py: 1,
                  // Negative margin keeps content aligned with the title
                  // while the hover fill still has room around it.
                  px: 1,
                  mx: -1,
                  "&:hover": { bgcolor: "action.hover" },
                  "&.Mui-focusVisible": {
                    outline: "2px solid",
                    outlineColor: "primary.main",
                  },
                }}
              >
                <Box sx={iconTileSx}>
                  <CalendarTodayOutlinedIcon fontSize="small" />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 600 }} noWrap>
                    {t.description || category || "Untitled"}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    {fullDate(t.transaction_date)}
                  </Typography>
                </Box>
                <Box
                  sx={[hideOnPhone, { justifyContent: "center", minWidth: 0 }]}
                >
                  {category && (
                    <Chip
                      label={category}
                      sx={{
                        bgcolor: style.chipBg,
                        color: style.color,
                        fontWeight: 500,
                        maxWidth: "100%",
                      }}
                    />
                  )}
                </Box>
                {shared && (
                  <Typography
                    variant="body2"
                    noWrap
                    sx={{
                      display: { xs: "none", sm: "block" },
                      color: "text.secondary",
                      textAlign: "right",
                    }}
                  >
                    {t.created_by && `by ${t.created_by}`}
                  </Typography>
                )}
                {/* nowrap keeps the sign on the same line as the amount. */}
                <Money
                  sx={{
                    fontSize: "1rem",
                    color: style.color,
                    textAlign: "right",
                    whiteSpace: "nowrap",
                  }}
                >
                  {style.sign}€{displayAmount(t.amount)}
                </Money>
              </ButtonBase>
            </li>
          );
        })}
      </Stack>
    </HomeCard>
  );
}
