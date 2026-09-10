/** @file Root route layout. Renders the matched page and owns document.title. */

import { Outlet } from "react-router";
import { useDocumentTitle } from "./routeMeta";

export function App() {
  // Must run once at the root so every route's title is set from one place.
  useDocumentTitle();
  return <Outlet />;
}
