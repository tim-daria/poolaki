/** @file Router errorElement: route errors and 404s, with a link back home. */

import {
  useRouteError,
  isRouteErrorResponse,
  Link as RouterLink,
} from "react-router";
import { Button } from "@mui/material";
import { ErrorScreen } from "../../components/ErrorScreen";

const NOT_FOUND = 404;

export function ErrorPage() {
  const error = useRouteError();
  const status = isRouteErrorResponse(error) ? error.status : 500;
  const msg =
    isRouteErrorResponse(error) && error.statusText
      ? error.statusText
      : "Something went wrong. Try again later.";

  return (
    <ErrorScreen
      eyebrow={`Error ${status}`}
      title={status === NOT_FOUND ? "Page not found" : "Something went wrong"}
      actions={
        <Button component={RouterLink} to="/" variant="contained">
          Back to home
        </Button>
      }
    >
      {msg}
    </ErrorScreen>
  );
}
