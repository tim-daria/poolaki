import styles from "./styles.module.css";
import { useCurrentOrg } from "../../context/useCurrentOrg";

export function Home() {
  const org = useCurrentOrg();

  return (
    <div className={styles.homeContainer}>
      <h1>{org.name}'s Overview</h1>
    </div>
  );
}

// Named alias for react-router's route-level `lazy`
export { Home as Component };
