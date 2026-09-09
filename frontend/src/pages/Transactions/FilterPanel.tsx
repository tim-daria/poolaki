/** @file Popover with the date range and category filters for the transactions list. */

import {
  Box,
  Button,
  Checkbox,
  Chip,
  FormControlLabel,
  Popover,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { SEED_CATEGORIES } from "../../lib/categories";
import type { TransactionFiltersApi } from "./useTransactionFilters";

interface FilterPanelProps extends TransactionFiltersApi {
  /** Element the popover hangs from; null keeps it closed. */
  anchor: HTMLElement | null;
  onClose: () => void;
}

export function FilterPanel({
  anchor,
  onClose,
  filters,
  update,
  toggleCategory,
  clear,
  activeCount,
}: FilterPanelProps) {
  return (
    <Popover
      open={Boolean(anchor)}
      anchorEl={anchor}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      transformOrigin={{ vertical: "top", horizontal: "right" }}
    >
      <Stack spacing={2} sx={{ p: 2, width: 340 }}>
        <Stack direction="row" spacing={1}>
          {/* Native date inputs: their value is already the ISO string the
              filters store. */}
          <TextField
            label="From"
            type="date"
            value={filters.from}
            onChange={(e) => update({ from: e.target.value })}
            size="small"
            slotProps={{ inputLabel: { shrink: true } }}
            fullWidth
          />
          <TextField
            label="To"
            type="date"
            value={filters.to}
            onChange={(e) => update({ to: e.target.value })}
            size="small"
            slotProps={{ inputLabel: { shrink: true } }}
            fullWidth
          />
        </Stack>

        <Box>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Categories
          </Typography>
          <Stack
            direction="row"
            spacing={0.5}
            sx={{ flexWrap: "wrap", rowGap: 0.5 }}
          >
            {SEED_CATEGORIES.map((c) => (
              <Chip
                key={c.id}
                label={c.label}
                size="small"
                color={
                  filters.categories.includes(c.id) ? "primary" : "default"
                }
                onClick={() => toggleCategory(c.id)}
              />
            ))}
          </Stack>
        </Box>

        <FormControlLabel
          label="Tax refundable"
          control={
            <Checkbox
              checked={filters.taxDeductible}
              onChange={(e) => update({ taxDeductible: e.target.checked })}
              size="small"
            />
          }
        />

        <Button onClick={clear} disabled={activeCount === 0}>
          Clear filters
        </Button>
      </Stack>
    </Popover>
  );
}
