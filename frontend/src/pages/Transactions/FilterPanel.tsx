/** @file Popover with the date range, category and tax filters for the transactions list. */

import {
  Box,
  Button,
  Checkbox,
  Divider,
  FormControlLabel,
  Popover,
  Stack,
  Typography,
} from "@mui/material";
import dayjs, { type Dayjs } from "dayjs";
import { IsoDatePicker } from "../../components/Form/IsoDatePicker";
import { SEED_CATEGORIES, type CategoryKind } from "../../lib/categories";
import { tintedWhenActive } from "./styles";
import type { TransactionFiltersApi } from "./useTransactionFilters";

function isoRange(from: Dayjs, to: Dayjs): [string, string] {
  return [from.format("YYYY-MM-DD"), to.format("YYYY-MM-DD")];
}

/** The three ranges worth a single click. Each returns [from, to] as ISO. */
const PRESETS: { label: string; range: () => [string, string] }[] = [
  {
    label: "This month",
    range: () => isoRange(dayjs().startOf("month"), dayjs().endOf("month")),
  },
  {
    label: "Last month",
    range: () => {
      const last = dayjs().subtract(1, "month");
      return isoRange(last.startOf("month"), last.endOf("month"));
    },
  },
  {
    label: "This year",
    range: () => isoRange(dayjs().startOf("year"), dayjs().endOf("year")),
  },
];

const SECTIONS: { kind: CategoryKind; heading: string }[] = [
  { kind: "expense", heading: "Expenses" },
  { kind: "income", heading: "Income" },
];

const headingSx = { fontSize: "1rem", fontWeight: 700 } as const;

/** Compact enough that the categories fit two to a row without scrolling. */
const checkLabelSx = {
  m: 0,
  "& .MuiFormControlLabel-label": { fontSize: "0.9rem" },
} as const;

interface FilterPanelProps extends TransactionFiltersApi {
  /** Element the popover hangs from; null keeps it closed. */
  anchor: HTMLElement | null;
  onClose: () => void;
  /**
   * Rows the current filters leave. Shown in the footer so the effect of a
   * checkbox is visible without closing the popover.
   */
  matchCount: number;
}

export function FilterPanel({
  anchor,
  onClose,
  filters,
  update,
  toggleCategory,
  clear,
  activeCount,
  matchCount,
}: FilterPanelProps) {
  return (
    <Popover
      open={Boolean(anchor)}
      anchorEl={anchor}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      transformOrigin={{ vertical: "top", horizontal: "right" }}
      slotProps={{ paper: { sx: { borderRadius: 3, mt: 1 } } }}
    >
      <Stack spacing={2} sx={{ p: 2.5, width: 400 }}>
        <Typography sx={headingSx}>Date range</Typography>

        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
          {PRESETS.map((preset) => {
            const [from, to] = preset.range();
            const active = filters.from === from && filters.to === to;
            return (
              <Button
                key={preset.label}
                size="small"
                variant="outlined"
                aria-pressed={active}
                // Pressing the active preset clears it, so a range set with
                // one click is undone by the same click.
                onClick={() =>
                  update(active ? { from: "", to: "" } : { from, to })
                }
                sx={tintedWhenActive(active)}
              >
                {preset.label}
              </Button>
            );
          })}
        </Stack>

        {/* No clear button in the fields: it would crowd out the date at this
            font size. The range chip and "Clear all" clear it instead. */}
        <Stack direction="row" spacing={1}>
          <IsoDatePicker
            label="From"
            value={filters.from}
            maxDate={filters.to ? dayjs(filters.to) : undefined}
            onChange={(from) => update({ from })}
            slotProps={{ textField: { size: "small", fullWidth: true } }}
          />
          <IsoDatePicker
            label="To"
            value={filters.to}
            minDate={filters.from ? dayjs(filters.from) : undefined}
            onChange={(to) => update({ to })}
            slotProps={{ textField: { size: "small", fullWidth: true } }}
          />
        </Stack>

        <Stack
          direction="row"
          sx={{ alignItems: "center", justifyContent: "space-between" }}
        >
          <Typography sx={headingSx}>Categories</Typography>
          <Button
            size="small"
            onClick={() => update({ categories: [] })}
            disabled={filters.categories.length === 0}
            sx={{ fontWeight: 600 }}
          >
            Clear
          </Button>
        </Stack>

        {SECTIONS.map((section) => (
          <Stack key={section.kind} spacing={0.5}>
            <Typography variant="label" color="text.secondary">
              {section.heading}
            </Typography>
            {/* Two columns filled row by row: a column per kind would leave
                the shorter list trailing empty space. */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                columnGap: 1,
              }}
            >
              {SEED_CATEGORIES.filter((c) => c.kind === section.kind).map(
                (c) => (
                  <FormControlLabel
                    key={c.id}
                    sx={checkLabelSx}
                    control={
                      <Checkbox
                        size="small"
                        checked={filters.categories.includes(c.id)}
                        onChange={() => toggleCategory(c.id)}
                      />
                    }
                    label={c.label}
                  />
                ),
              )}
            </Box>
          </Stack>
        ))}

        {/* Not a category, so it sits on its own below both groups. */}
        <FormControlLabel
          sx={checkLabelSx}
          control={
            <Checkbox
              size="small"
              checked={filters.taxDeductible}
              onChange={(e) => update({ taxDeductible: e.target.checked })}
            />
          }
          label="Tax refundable"
        />

        <Divider />

        <Stack
          direction="row"
          sx={{ alignItems: "center", justifyContent: "space-between" }}
        >
          <Button
            onClick={clear}
            disabled={activeCount === 0}
            sx={{ fontWeight: 600 }}
          >
            Clear all
          </Button>
          <Typography variant="body2" color="text.secondary">
            {matchCount === 1
              ? "1 transaction matches"
              : `${matchCount} transactions match`}
          </Typography>
        </Stack>
      </Stack>
    </Popover>
  );
}
