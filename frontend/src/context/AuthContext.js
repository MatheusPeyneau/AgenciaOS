import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("agenciaos_token"));
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    const storedToken = localStorage.getItem("agenciaos_token");
    if (!storedToken) {
      setLoading(false);
      return;
    }
    try {
      const res = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${storedToken}` },
      });
      setUser(res.data);
      setToken(storedToken);
    } catch {
      localStorage.removeItem("agenciaos_token");
      setToken(null);
      setUser(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // CRITICAL: If returning from OAuth callback, skip the /me check.
    // AuthCallback will exchange the session_id and establish the session first.
    if (window.location.hash?.includes("session_id=")) {
      setLoading(false);
      return;
    }
    checkAuth();
  }, [checkAuth]);

  const login = useCallback((newToken, userData) => {
    localStorage.setItem("agenciaos_token", newToken);
    setToken(newToken);
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    const storedToken = localStorage.getItem("agenciaos_token");
    try {
      await axios.post(
        `${API}/auth/logout`,
        {},
        { headers: { Authorization: `Bearer ${storedToken}` } }
      );
    } catch {
      // ignore logout error
    }
    localStorage.removeItem("agenciaos_token");
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export { API };
