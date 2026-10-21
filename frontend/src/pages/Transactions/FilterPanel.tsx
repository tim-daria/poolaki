/**
 * @file The date range, category, member and tax filters for the
 * transactions list: a popover under the Filters button on desktop, a bottom
 * sheet on phones.
 */

import { useId } from "react";
import {
  Box,
  Button,
  Checkbox,
  Divider,
  Drawer,
  FormControlLabel,
  IconButton,
  Popover,
  Stack,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import dayjs, { type Dayjs } from "dayjs";
import { IsoDatePicker } from "../../components/Form/IsoDatePicker";
import { useRestoreFocus } from "../../hooks/useRestoreFocus";
import { useSheet } from "../../hooks/useSheet";
import { type Category, type CategoryKind } from "../../lib/categories";
import type { Member } from "../../lib/organizations";
import { tintedWhenActive } from "./styles";
import type { TransactionFiltersApi } from "./useTransactionFilters";

/** Popover width; the sheet takes the viewport instead. */
const WIDTH = 400;

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

/**
 * Two columns filled row by row (a column per kind would leave the shorter
 * list trailing empty space); a sheet too narrow for two drops to one
 * instead of clipping labels.
 */
const checkGridSx = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
  columnGap: 1,
} as const;

interface FilterPanelProps extends TransactionFiltersApi {
  /** Element the popover hangs from; null keeps it closed. */
  anchor: HTMLElement | null;
  onClose: () => void;
  categories: Category[];
  /** The member filter is offered only with more than one. */
  members: Member[];
  /**
   * Rows the current filters leave. Shown in the footer so the effect of a
   * checkbox is visible without closing the panel.
   */
  matchCount: number;
}

export function FilterPanel({
  anchor,
  onClose,
  filters,
  update,
  toggleCategory,
  toggleMember,
  clear,
  activeCount,
  matchCount,
  categories,
  members,
}: FilterPanelProps) {
  const open = Boolean(anchor);
  /** The Filters button must not keep focus while the panel hides it — see the hook. */
  const restoreFocus = useRestoreFocus(open);
  const { anchor: drawerAnchor, paperSx } = useSheet(WIDTH, true);
  const sheet = drawerAnchor === "bottom";
  const titleId = useId();

  const content = (
    <Stack
      spacing={2}
      sx={{
        p: 2.5,
        width: sheet ? "auto" : WIDTH,
        // The sheet scrolls inside itself and clears the home indicator.
        ...(sheet && {
          flex: 1,
          overflowY: "auto",
          pb: "calc(20px + env(safe-area-inset-bottom))",
        }),
      }}
    >
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
          <Box sx={checkGridSx}>
            {categories
              .filter((c) => c.type === section.kind)
              .map((c) => (
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
                  label={c.name}
                />
              ))}
          </Box>
        </Stack>
      ))}

      {/* A personal workspace has one member; the section would be noise. */}
      {members.length > 1 && (
        <Stack spacing={0.5}>
          <Typography sx={headingSx}>Members</Typography>
          <Box sx={checkGridSx}>
            {members.map((m) => (
              <FormControlLabel
                key={m.user_id}
                sx={checkLabelSx}
                control={
                  <Checkbox
                    size="small"
                    checked={filters.members.includes(m.user_id)}
                    onChange={() => toggleMember(m.user_id)}
                  />
                }
                label={m.username}
              />
            ))}
          </Box>
        </Stack>
      )}

      {/* Not a category, so it sits on its own below the groups. */}
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
  );

  if (sheet) {
    return (
      <Drawer
        anchor={drawerAnchor}
        open={open}
        onClose={onClose}
        // Disabled so it does not happen too early; restoreFocus does it instead.
        disableRestoreFocus
        slotProps={{
          transition: { onExited: restoreFocus },
          paper: {
            role: "dialog",
            "aria-labelledby": titleId,
            sx: { ...paperSx, display: "flex", flexDirection: "column" },
          },
        }}
      >
        {/* No anchor names the sheet and no Escape key closes it. */}
        <Stack
          direction="row"
          sx={{
            alignItems: "center",
            justifyContent: "space-between",
            px: 2.5,
            py: 1.5,
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography id={titleId} component="h2" sx={{ fontWeight: 700 }}>
            Filters
          </Typography>
          <IconButton aria-label="Close filters" onClick={onClose} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
        {content}
      </Drawer>
    );
  }

  return (
    <Popover
      open={open}
      anchorEl={anchor}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      transformOrigin={{ vertical: "top", horizontal: "right" }}
      // Disabled so it does not happen too early; restoreFocus does it instead.
      disableRestoreFocus
      slotProps={{
        paper: { sx: { borderRadius: 3, mt: 1 } },
        transition: { onExited: restoreFocus },
      }}
    >
      {content}
    </Popover>
  );
}
