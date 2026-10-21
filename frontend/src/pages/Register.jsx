import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import api, { errMsg } from "../api/client.js";
import { Button, ErrorAlert, FormField } from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", username: "", first_name: "", last_name: "", role: "student", password: "", password2: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  if (user) return <Navigate to="/dashboard" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.password2) return setError("Passwords do not match.");
    setLoading(true);
    try { await register(form); navigate("/dashboard"); }
    catch (err) { setError(errMsg(err)); } finally { setLoading(false); }
  };

  return (
    <form className="auth-card card" onSubmit={submit}>
      <h2>Create account</h2>
      <ErrorAlert message={error} />
      <div className="grid-2">
        <FormField label="First name"><input value={form.first_name} onChange={set("first_name")} /></FormField>
        <FormField label="Last name"><input value={form.last_name} onChange={set("last_name")} /></FormField>
      </div>
      <FormField label="Username"><input required value={form.username} onChange={set("username")} /></FormField>
      <FormField label="Email"><input type="email" required value={form.email} onChange={set("email")} /></FormField>
      <FormField label="I am a">
        <select value={form.role} onChange={set("role")}>
          <option value="student">Student</option>
          <option value="instructor">Instructor</option>
        </select>
      </FormField>
      <FormField label="Password (min 8 chars)"><input type="password" required minLength={8} value={form.password} onChange={set("password")} /></FormField>
      <FormField label="Confirm password"><input type="password" required value={form.password2} onChange={set("password2")} /></FormField>
      <Button loading={loading} type="submit">Register</Button>
      <p className="small muted">Already registered? <Link to="/login">Log in</Link></p>
    </form>
  );
}
