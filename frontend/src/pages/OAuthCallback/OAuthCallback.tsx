import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../context/useAuth";

export default function OAuthCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  useEffect(() => {
    fetch("/_allauth/browser/v1/auth/session", {
      credentials: "include",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.data?.user) {
          setUser(data.data.user);
        }
        navigate("/", { replace: true });
      })
      .catch(() => navigate("/login", { replace: true }));
  }, [navigate, setUser]);

  return null;
}
