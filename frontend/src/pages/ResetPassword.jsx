import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api, { errMsg } from "../api/client.js";
import { Button, ErrorAlert, FormField, SuccessAlert } from "../components/ui.jsx";

export default function ResetPassword() {
  const { uid, token } = useParams();
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (pw !== pw2) return setError("Passwords do not match.");
    setLoading(true);
    try {
      setMsg((await api.post("/auth/reset-password/", { uid, token, new_password: pw })).data.detail);
      setTimeout(() => navigate("/login"), 1800);
    } catch (err) { setError(errMsg(err)); } finally { setLoading(false); }
  };

  return (
    <form className="auth-card card" onSubmit={submit}>
      <h2>Reset password</h2>
      <ErrorAlert message={error} />
      <SuccessAlert message={msg} />
      <FormField label="New password"><input type="password" required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} /></FormField>
      <FormField label="Confirm new password"><input type="password" required value={pw2} onChange={(e) => setPw2(e.target.value)} /></FormField>
      <Button loading={loading} type="submit">Reset password</Button>
      <p className="small"><Link to="/login">Back to login</Link></p>
    </form>
  );
}
