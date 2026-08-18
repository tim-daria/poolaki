import { useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import styles from "./styles.module.css";
import { useCurrentOrg } from "../../context/useCurrentOrg";
import { PageAction, PageTitle } from "../../components/PageHeader/PageHeader";
import { UniversalModal as Modal } from "../../components/Modal/Modal";

function greeting(hour: number) {
  if (hour < 12) return "Good Morning!";
  if (hour < 18) return "Good Afternoon!";
  return "Good Evening!";
}

export function Home() {
  const org = useCurrentOrg();
  const [addOpen, setAddOpen] = useState(false);
  const now = new Date();

  return (
    <Box className={styles.homeContainer}>
      <PageTitle
        title={greeting(now.getHours())}
        subtitle={now.toLocaleDateString(undefined, {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
      />
      <PageAction>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setAddOpen(true)}
          sx={{ borderRadius: 999, px: 2.5 }}
        >
          Add Transaction
        </Button>
      </PageAction>

      <Typography variant="h1">{org.name}'s Overview</Typography>

      {addOpen && (
        <Modal mode="transaction" onClose={() => setAddOpen(false)} />
      )}
    </Box>
  );
}

// Named alias for react-router's route-level `lazy`
export { Home as Component };
