import { useCurrentOrg } from "../../context/useCurrentOrg";

export function Goals() {
  const org = useCurrentOrg();

  return (
    <div>
      <h1>{org.name}'s Goals Page</h1>
    </div>
  );
}

// Named alias for react-router's route-level `lazy`
export { Goals as Component };
