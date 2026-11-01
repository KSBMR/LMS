import { useState } from "react";
import api, { errMsg } from "../api/client.js";
import { Button, Empty, ErrorAlert, Loader, PageHeader } from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import useFetch from "../hooks/useFetch.js";

export default function Users() {
  const { user: me } = useAuth();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const { data, loading, error, reload } = useFetch("/auth/users/", { search, role });
  const [err, setErr] = useState("");

  const patch = async (u, body) => {
    setErr("");
    try { await api.patch(`/auth/users/${u.id}/`, body); reload(); } catch (e) { setErr(errMsg(e)); }
  };
  const del = async (u) => {
    if (!window.confirm(`Delete ${u.email}?`)) return;
    try { await api.delete(`/auth/users/${u.id}/`); reload(); } catch (e) { setErr(errMsg(e)); }
  };

  return (
    <>
      <PageHeader title="User management" />
      <div className="filters">
        <input placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">All roles</option><option value="admin">Admin</option><option value="instructor">Instructor</option><option value="student">Student</option>
        </select>
      </div>
      <ErrorAlert message={error || err} onRetry={reload} />
      {loading ? <Loader /> : data?.length ? (
        <div className="card">
          <table className="table">
            <thead><tr><th>Email</th><th>Name</th><th>Role</th><th>Active</th><th /></tr></thead>
            <tbody>{data.map((u) => (
              <tr key={u.id}>
                <td>{u.email}</td><td>{`${u.first_name} ${u.last_name}`.trim() || u.username}</td>
                <td>
                  <select value={u.role} disabled={u.id === me.id} onChange={(e) => patch(u, { role: e.target.value })}>
                    <option value="admin">admin</option><option value="instructor">instructor</option><option value="student">student</option>
                  </select>
                </td>
                <td><input type="checkbox" checked={u.is_active} disabled={u.id === me.id} onChange={(e) => patch(u, { is_active: e.target.checked })} /></td>
                <td className="actions">{u.id !== me.id && <Button variant="danger" onClick={() => del(u)}>Delete</Button>}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : !error && <Empty>No users found.</Empty>}
    </>
  );
}
