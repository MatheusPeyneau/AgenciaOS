import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AuthCallback() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace("#", "?"));
    const sessionId = params.get("session_id");

    if (!sessionId) {
      navigate("/login");
      return;
    }

    (async () => {
      try {
        const res = await axios.post(`${API}/auth/session`, { session_id: sessionId });
        login(res.data.token, res.data.user);
        window.history.replaceState(null, "", window.location.pathname);
        navigate("/dashboard", { replace: true });
      } catch (err) {
        console.error("OAuth callback error:", err);
        navigate("/login");
      }
    })();
  }, [login, navigate]);

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Autenticando com Google...</p>
      </div>
    </div>
  );
}
