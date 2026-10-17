/** @file Reports page: a placeholder until the monthly overview and category breakdown land. */

import { Box, Paper, Typography } from "@mui/material";
import { PageTitle } from "../../components/PageHeader/PageHeader";

function Reports() {
  return (
    <Box sx={{ px: 3, pb: 5 }}>
      <PageTitle />
      <Paper elevation={0} sx={{ borderRadius: 4, p: { xs: 2.5, sm: 3 } }}>
        <Typography sx={{ color: "text.secondary" }}>
          Reports are coming soon.
        </Typography>
      </Paper>
    </Box>
  );
}

// Named export required by react-router's route-level `lazy`.
export { Reports as Component };
