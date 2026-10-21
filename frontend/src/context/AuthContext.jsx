import { createContext, useCallback, useContext, useEffect, useState } from "react";
import api, { refreshAccess, setAccessToken, setAuthFailureHandler } from "../api/client.js";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true while restoring the session

  // Restore the session on page load using the HttpOnly refresh cookie.
  useEffect(() => {
    setAuthFailureHandler(() => setUser(null));
    refreshAccess()
      .then((d) => setUser(d.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const handleAuth = (data) => { setAccessToken(data.access); setUser(data.user); return data.user; };

  const login = useCallback(async (email, password) => handleAuth((await api.post("/auth/login/", { email, password })).data), []);
  const register = useCallback(async (payload) => handleAuth((await api.post("/auth/register/", payload)).data), []);
  const logout = useCallback(async () => {
    try { await api.post("/auth/logout/"); } finally { setAccessToken(null); setUser(null); }
  }, []);
  const refreshProfile = useCallback(async () => setUser((await api.get("/auth/profile/")).data), []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshProfile, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}
