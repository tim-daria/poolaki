/** @file Net balance half of the top card: the figure, fitted to its width, and the change since the 1st. */

import { useRef } from "react";
import { Box, Typography, useMediaQuery } from "@mui/material";
import { Money } from "../../components/Money";
import { useElementSize } from "../../hooks/useElementSize";
import { shortDate } from "../../lib/date";
import { compactAmount, displayFigure, splitCents } from "../../lib/money";
import { DESKTOP_QUERY } from "../../lib/layout";

interface Props {
  balance: number;
  /** Since the first of the month; null when nothing predates the month. */
  change: number | null;
  /** First day of the month, ISO. */
  monthStart: string;
}

/** Width of one glyph in the mono font, as a fraction of the font size. */
const GLYPH_EM = 0.6;
const MAX_PX = { desktop: 44, mobile: 32 };
const MIN_PX = 28;

export function NetBalanceCard({ balance, change, monthStart }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { width } = useElementSize(ref);
  const desktop = useMediaQuery(DESKTOP_QUERY);

  const negative = balance < 0;
  const { whole, cents } = splitCents(Math.abs(balance));
  const full = `${negative ? "-" : ""}€${whole}${cents}`;

  // The largest size at which the figure fits, floored so it still reads as
  // a headline. Past the floor the figure is abbreviated instead of wrapped.
  const max = desktop ? MAX_PX.desktop : MAX_PX.mobile;
  const fitted = width > 0 ? width / (full.length * GLYPH_EM) : max;
  const fontSize = Math.max(MIN_PX, Math.min(max, fitted));
  const abbreviated = width > 0 && fitted < MIN_PX;
  const shownChange = change !== null;

  return (
    <Box
      ref={ref}
      sx={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}
    >
      <Typography component="h2" sx={{ fontWeight: 700, fontSize: "1.15rem" }}>
        Net balance
      </Typography>

      <Box sx={{ flex: 1, display: "flex", alignItems: "center", py: 2 }}>
        <Box>
          <Money
            aria-label={abbreviated ? full : undefined}
            title={abbreviated ? full : undefined}
            sx={{
              display: "block",
              fontSize,
              fontWeight: 500,
              lineHeight: 1.1,
              whiteSpace: "nowrap",
              color: negative ? "error.main" : "text.primary",
            }}
          >
            {abbreviated ? (
              `${negative ? "-" : ""}€${compactAmount(Math.abs(balance))}`
            ) : (
              <>
                {negative && "-"}€{whole}
                <Box component="span" sx={{ fontSize: "0.5em" }}>
                  {cents}
                </Box>
              </>
            )}
          </Money>
          {/* The abbreviation drops digits and cents; the exact figure
              follows in the secondary line so nothing is lost to a hover. */}
          {abbreviated && (
            <Typography
              variant="body2"
              sx={{ mt: 0.5, color: "text.secondary", whiteSpace: "nowrap" }}
            >
              <Money>{full}</Money>
            </Typography>
          )}
          {shownChange && (
            <Typography
              variant="body2"
              sx={{
                mt: 1,
                color: change >= 0 ? "success.main" : "error.main",
              }}
            >
              {change >= 0 ? "↑" : "↓"}{" "}
              <Money>€{displayFigure(Math.abs(change))}</Money> since{" "}
              {shortDate(monthStart)}
            </Typography>
          )}
        </Box>
      </Box>

      <Typography
        sx={{ color: negative ? "error.main" : "text.secondary", mt: "auto" }}
      >
        {negative
          ? "Below zero: more went out than you had"
          : "Available to spend"}
      </Typography>
    </Box>
  );
}
