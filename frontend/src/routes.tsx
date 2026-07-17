import { createBrowserRouter } from "react-router";
import App from "./App";
import AppLayout from "./components/AppLayout";
import GuestRoute from "./components/GuestRoute";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login/Login";
import Register from "./pages/Register/Register";
import Home from "./pages/Home/Home";
import OAuthCallback from "./pages/OAuthCallback/OAuthCallback";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        element: <GuestRoute />,
        children: [
          { path: "login", element: <Login /> },
          { path: "register", element: <Register /> },
        ],
      },
      { path: "oauth-callback", element: <OAuthCallback /> },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppLayout />,
            children: [{ index: true, element: <Home /> }],
          },
        ],
      },
    ],
  },
]);

export default router;
