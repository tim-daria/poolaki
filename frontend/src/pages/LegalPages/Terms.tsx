import { Link } from "react-router";

export function Terms() {
  return (
    <>
      <h1>Here will be Terms of Use</h1>
      <Link to="/">Back to the Homepage</Link>
    </>
  );
}

// Named alias for react-router's route-level `lazy`
export { Terms as Component };
