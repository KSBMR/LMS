import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { errMsg } from "../api/client.js";
import { Button, ErrorAlert, FormField } from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await login(form.email, form.password);
      navigate(location.state?.from?.pathname || "/dashboard", { replace: true });
    } catch (err) { setError(errMsg(err)); } finally { setLoading(false); }
  };

  return (
    <form className="auth-card card" onSubmit={submit}>
      <h2>Welcome back</h2>
      <ErrorAlert message={error} />
      <FormField label="Email"><input type="email" required autoFocus value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></FormField>
      <FormField label="Password"><input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></FormField>
      <Button loading={loading} type="submit">Log in</Button>
      <p className="small"><Link to="/forgot-password">Forgot password?</Link></p>
      <p className="small muted">No account? <Link to="/register">Register</Link></p>
    </form>
  );
}
