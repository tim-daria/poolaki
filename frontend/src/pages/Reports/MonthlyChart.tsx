import { useState } from "react";
import { Box, Card, Typography } from "@mui/material";
import type { YearlyReportResponse } from "../../lib/reports";
import { parseMoney } from "../../lib/money";
import { Segmented } from "./Segmented";
import { eur } from "./eur";

// Rounds up to a "nice" axis maximum (1, 2, 5 x 10^n)
function niceMax(value: number) {
  if (value <= 0) return 1;
  const exp = 10 ** Math.floor(Math.log10(value));
  const f = value / exp;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * exp;
}

type MonthView = "IncomeExpenses" | "Savings";

type MonthlyChartProps = {
  monthly: YearlyReportResponse["monthly"];
  year: number;
  // Index 0 = January. TODO: replace with real data when the backend returns contributions.
  savingsByMonth: number[];
  sx?: object; // lets the parent control spacing (e.g. mb) without this file knowing the layout
};

export function MonthlyChart({ monthly, year, savingsByMonth, sx }: MonthlyChartProps) {
  const [view, setView] = useState<MonthView>("IncomeExpenses");

  // Null for past years, where every month is "complete"
  const currentYear = new Date().getFullYear();
  const currentMonth = year === currentYear ? new Date().getMonth() + 1 : null;

  // Current month = full color, past months = attenuated, future months = hidden
  const monthOpacity = (month: number) => {
    if (currentMonth === null || month === currentMonth) return 1;
    return month < currentMonth ? 0.35 : 0;
  };

  // One entry per month; the values depend on the active tab
  const bars = monthly.map((m) => ({
    month: m.month,
    values:
      view === "IncomeExpenses"
        ? [
            { value: parseMoney(m.income), color: "success.main" },
            { value: parseMoney(m.expense), color: "error.main" },
          ]
        : [{ value: savingsByMonth[m.month - 1] ?? 0, color: "accent.main" }],
  }));

  // Axis maximum computed from the data instead of a fixed number
  const axisMax = niceMax(Math.max(0, ...bars.flatMap((b) => b.values.map((v) => v.value))));
  const axisTicks = [axisMax, axisMax / 2, 0];

  // Average line: Savings tab only, and only over months already elapsed
  const elapsed = bars.filter((b) => monthOpacity(b.month) > 0);
  const average =
    view === "Savings" && elapsed.length > 0
      ? elapsed.reduce((sum, b) => sum + b.values[0].value, 0) / elapsed.length
      : null;

  const legend =
    view === "IncomeExpenses"
      ? [
          { label: "Income", color: "success.main" },
          { label: "Expenses", color: "error.main" },
        ]
      : [{ label: "Saved per month", color: "accent.main" }];

  return (
    <Card
      sx={{
        borderRadius: 4,
        boxShadow: "none",
        border: "1px solid",
        borderColor: "divider",
        p: 3,
        "@media print": { breakInside: "avoid" },
        ...sx,
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
        <Typography variant="h6" sx={{ fontWeight: "bold" }}>
          By month
        </Typography>
        <Segmented<MonthView>
          value={view}
          onChange={setView}
          options={[
            { value: "IncomeExpenses", label: "Income & expenses" },
            { value: "Savings", label: "Savings" },
          ]}
        />
      </Box>

      <Box sx={{ display: "flex", gap: 1 }}>
        {/* Y axis labels */}
        <Box sx={{ height: 200, display: "flex", flexDirection: "column", justifyContent: "space-between", width: 72 }}>
          {axisTicks.map((tick) => (
            <Typography key={tick} variant="caption" sx={{ color: "text.secondary", lineHeight: 1 }}>
              {tick === 0 ? "0" : eur(tick)}
            </Typography>
          ))}
        </Box>

        <Box sx={{ flex: 1 }}>
          {/* Plot area */}
          <Box sx={{ position: "relative", height: 200 }}>
            {/* Horizontal grid lines */}
            {[0, 50, 100].map((pos) => (
              <Box
                key={pos}
                sx={{ position: "absolute", left: 0, right: 0, top: `${pos}%`, borderTop: "1px solid", borderColor: "divider" }}
              />
            ))}

            {/* Dashed average line (Savings tab only) */}
            {average !== null && (
              <Box
                sx={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: `${(average / axisMax) * 100}%`,
                  borderTop: "1px dashed",
                  borderColor: "text.secondary",
                }}
              >
                <Typography variant="caption" sx={{ position: "absolute", right: 0, bottom: 2, color: "text.secondary" }}>
                  avg {eur(Math.round(average))}
                </Typography>
              </Box>
            )}

            <Box sx={{ position: "relative", height: "100%", display: "flex", alignItems: "flex-end", gap: 2 }}>
              {bars.map((b) => {
                const isCurrent = b.month === currentMonth;
                const tallest = Math.max(...b.values.map((v) => v.value));

                return (
                  <Box
                    key={b.month}
                    sx={{
                      flex: 1,
                      height: "100%",
                      position: "relative",
                      display: "flex",
                      gap: 0.5,
                      alignItems: "flex-end",
                      justifyContent: "center",
                      opacity: monthOpacity(b.month),
                    }}
                  >
                    {/* Value label above the highlighted month */}
                    {isCurrent && (
                      <Typography
                        variant="caption"
                        sx={{
                          position: "absolute",
                          bottom: `calc(${(tallest / axisMax) * 100}% + 4px)`,
                          fontWeight: "bold",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {eur(tallest)}
                      </Typography>
                    )}
                    {b.values.map((v, idx) => (
                      <Box
                        key={idx}
                        sx={{
                          width: 14,
                          height: `${Math.min((v.value / axisMax) * 100, 100)}%`,
                          bgcolor: v.color,
                          borderRadius: "4px 4px 0 0",
                        }}
                      />
                    ))}
                  </Box>
                );
              })}
            </Box>
          </Box>

          {/* Month names, same gap as the bars so they line up */}
          <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
            {bars.map((b) => (
              <Typography
                key={b.month}
                variant="caption"
                sx={{
                  flex: 1,
                  textAlign: "center",
                  color: b.month === currentMonth ? "text.primary" : "text.secondary",
                  fontWeight: b.month === currentMonth ? "bold" : "normal",
                }}
              >
                {new Date(year, b.month - 1).toLocaleString("en", { month: "short" })}
              </Typography>
            ))}
          </Box>

          {/* Legend */}
          <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
            {legend.map((item) => (
              <Box key={item.label} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: item.color }} />
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {item.label}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Card>
  );
}