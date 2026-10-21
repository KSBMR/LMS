import { useState } from "react";
import { Link } from "react-router-dom";
import api, { errMsg } from "../api/client.js";
import { Button, ErrorAlert, FormField, SuccessAlert } from "../components/ui.jsx";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setMsg(""); setLoading(true);
    try { setMsg((await api.post("/auth/forgot-password/", { email })).data.detail); }
    catch (err) { setError(errMsg(err)); } finally { setLoading(false); }
  };

  return (
    <form className="auth-card card" onSubmit={submit}>
      <h2>Forgot password</h2>
      <p className="muted small">Enter your email and we'll send you a reset link.</p>
      <ErrorAlert message={error} />
      <SuccessAlert message={msg} />
      <FormField label="Email"><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></FormField>
      <Button loading={loading} type="submit">Send reset link</Button>
      <p className="small"><Link to="/login">Back to login</Link></p>
    </form>
  );
}
