import {
  PageActionButton,
  PageTitle,
} from "../../components/PageHeader/PageHeader";
import { useCurrentOrg } from "../../context/useCurrentOrg";
import { Box, Typography } from "@mui/material";

function Goals() {
  const org = useCurrentOrg();

  return (
    <Box
      sx={{ px: 3, pb: 5, display: "flex", flexDirection: "column", gap: 3 }}
    >
      <PageTitle />
      <PageActionButton>Add goal</PageActionButton>
      <Typography>{org.name}'s Goals Page</Typography>
      Page is under construction
    </Box>
  );
}

// Named alias for react-router's route-level `lazy`
export { Goals as Component };
