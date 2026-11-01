import { useState } from "react";
import api, { errMsg } from "../api/client.js";
import { Button, ErrorAlert, FormField, PageHeader, SuccessAlert } from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const ROLE_FIELDS = {
  student: [["student_id", "Student ID"], ["education_level", "Education level"], ["interests", "Interests"]],
  instructor: [["expertise", "Expertise"], ["qualification", "Qualification"], ["years_of_experience", "Years of experience", "number"]],
};

export default function Profile() {
  const { user, setUser, logout } = useAuth();
  const [form, setForm] = useState({
    username: user.username, first_name: user.first_name, last_name: user.last_name, phone: user.phone, bio: user.bio,
    profile: user.profile || {},
  });
  const [pw, setPw] = useState({ old_password: "", new_password: "" });
  const [msg, setMsg] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState(""); const [pwErr, setPwErr] = useState("");
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const setP = (k) => (e) => setForm({ ...form, profile: { ...form.profile, [k]: e.target.value } });

  const save = async (e) => {
    e.preventDefault(); setMsg(""); setError(""); setLoading(true);
    try { setUser((await api.patch("/auth/profile/", form)).data); setMsg("Profile updated."); }
    catch (err) { setError(errMsg(err)); } finally { setLoading(false); }
  };

  const changePw = async (e) => {
    e.preventDefault(); setPwMsg(""); setPwErr("");
    try { await api.post("/auth/change-password/", pw); setPwMsg("Password changed. Logging out..."); setTimeout(logout, 1200); }
    catch (err) { setPwErr(errMsg(err)); }
  };

  return (
    <>
      <PageHeader title="My profile" />
      <div className="grid-2 align-start">
        <form className="card pad" onSubmit={save}>
          <p className="muted small">{user.email} · <span className="badge">{user.role}</span></p>
          <ErrorAlert message={error} /><SuccessAlert message={msg} />
          <div className="grid-2">
            <FormField label="First name"><input value={form.first_name} onChange={set("first_name")} /></FormField>
            <FormField label="Last name"><input value={form.last_name} onChange={set("last_name")} /></FormField>
          </div>
          <FormField label="Username"><input value={form.username} onChange={set("username")} /></FormField>
          <FormField label="Phone"><input value={form.phone} onChange={set("phone")} /></FormField>
          <FormField label="Bio"><textarea rows={3} value={form.bio} onChange={set("bio")} /></FormField>
          {(ROLE_FIELDS[user.role] || []).map(([k, label, type]) => (
            <FormField key={k} label={label}><input type={type || "text"} value={form.profile[k] ?? ""} onChange={setP(k)} /></FormField>
          ))}
          <Button loading={loading} type="submit">Save changes</Button>
        </form>

        <form className="card pad" onSubmit={changePw}>
          <h3>Change password</h3>
          <ErrorAlert message={pwErr} /><SuccessAlert message={pwMsg} />
          <FormField label="Current password"><input type="password" required value={pw.old_password} onChange={(e) => setPw({ ...pw, old_password: e.target.value })} /></FormField>
          <FormField label="New password"><input type="password" required minLength={8} value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} /></FormField>
          <Button type="submit" variant="secondary">Change password</Button>
        </form>
      </div>
    </>
  );
}
