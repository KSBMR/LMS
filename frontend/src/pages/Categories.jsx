import { useState } from "react";
import api, { errMsg } from "../api/client.js";
import { Button, Empty, ErrorAlert, Loader, PageHeader } from "../components/ui.jsx";
import useFetch from "../hooks/useFetch.js";

export default function Categories() {
  const { data, loading, error, reload } = useFetch("/categories/");
  const [form, setForm] = useState({ name: "", description: "" });
  const [editing, setEditing] = useState(null);
  const [err, setErr] = useState("");

  const save = async (e) => {
    e.preventDefault(); setErr("");
    try {
      if (editing) await api.patch(`/categories/${editing}/`, form); else await api.post("/categories/", form);
      setForm({ name: "", description: "" }); setEditing(null); reload();
    } catch (e2) { setErr(errMsg(e2)); }
  };
  const del = async (c) => {
    if (!window.confirm(`Delete category "${c.name}"? Its courses will become uncategorised.`)) return;
    try { await api.delete(`/categories/${c.id}/`); reload(); } catch (e) { setErr(errMsg(e)); }
  };

  return (
    <>
      <PageHeader title="Course categories" />
      <form className="card pad filters" onSubmit={save}>
        <input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <Button type="submit">{editing ? "Update" : "Add"}</Button>
        {editing && <Button type="button" variant="ghost" onClick={() => { setEditing(null); setForm({ name: "", description: "" }); }}>Cancel</Button>}
      </form>
      <ErrorAlert message={error || err} onRetry={reload} />
      {loading ? <Loader /> : data?.length ? (
        <div className="card">
          <table className="table">
            <thead><tr><th>Name</th><th>Description</th><th>Courses</th><th /></tr></thead>
            <tbody>{data.map((c) => (
              <tr key={c.id}><td>{c.name}</td><td>{c.description}</td><td>{c.course_count}</td>
                <td className="actions">
                  <Button variant="secondary" onClick={() => { setEditing(c.id); setForm({ name: c.name, description: c.description }); }}>Edit</Button>
                  <Button variant="danger" onClick={() => del(c)}>Delete</Button>
                </td></tr>
            ))}</tbody>
          </table>
        </div>
      ) : !error && <Empty>No categories yet.</Empty>}
    </>
  );
}
