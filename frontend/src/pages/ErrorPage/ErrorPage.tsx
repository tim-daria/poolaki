import { useRouteError, isRouteErrorResponse, useNavigate } from "react-router";

export function ErrorPage() {
  const error = useRouteError();
  const nav = useNavigate();
  const status = isRouteErrorResponse(error) ? error.status : 500;
  const msg = isRouteErrorResponse(error)
    ? error.statusText
    : "Something went wrong. Try again later.";

  return (
    <div>
      <h1>{status}</h1>
      <p>{msg}</p>
      <button onClick={() => nav("/")}>Home</button>
    </div>
  );
}
