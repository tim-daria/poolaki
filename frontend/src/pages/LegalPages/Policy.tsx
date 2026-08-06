import { Link } from "react-router";

export function Policy() {
  return (
    <>
      <h1>Here will be Privacy Policy</h1>
      <Link to="/">Back to the Homepage</Link>
    </>
  );
}

// Named alias for react-router's route-level `lazy`
export { Policy as Component };
