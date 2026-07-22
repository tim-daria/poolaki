import { createBrowserRouter } from "react-router";
import App from "./App";
import AppLayout from "./components/AppLayout";
import GuestRoute from "./components/GuestRoute";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login/Login";
import Register from "./pages/Register/Register";
import Home from "./pages/Home/Home";
import Transactions from "./pages/Transactions/Transactions";
import Goals from "./pages/Goals/Goals";
import Categories from "./pages/Categories/Categories";
import OAuthCallback from "./pages/OAuthCallback/OAuthCallback";
import ErrorPage from "./pages/ErrorPage/ErrorPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    errorElement: <ErrorPage />,
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
            children: [
              { index: true, element: <Home />, handle: { title: "Overview" } },
              { path: "transactions", element: <Transactions />, handle: { title: "Transactions" } },
              { path: "goals", element: <Goals />, handle: { title: "Goals" } },
              { path: "categories", element: <Categories />, handle: { title: "Categories" } },
            ],
          },
        ],
      },
    ],
  },
]);

export default router;
