import { useState } from "react";
import { Link } from "react-router-dom";
import api, { errMsg } from "../api/client.js";
import { Button, Empty, ErrorAlert, Loader, PageHeader } from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import useFetch from "../hooks/useFetch.js";

export default function ManageCourses() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useFetch("/courses/", user.role === "instructor" ? { mine: 1 } : {});
  const [err, setErr] = useState("");

  const del = async (c) => {
    if (!window.confirm(`Delete "${c.title}"?`)) return;
    try { await api.delete(`/courses/${c.id}/`); reload(); } catch (e) { setErr(errMsg(e)); }
  };
  const togglePublish = async (c) => {
    try { await api.patch(`/courses/${c.id}/`, { is_published: !c.is_published }); reload(); } catch (e) { setErr(errMsg(e)); }
  };

  return (
    <>
      <PageHeader title={user.role === "admin" ? "All courses" : "My courses"} actions={<Link className="btn btn-primary" to="/manage-courses/new">+ New course</Link>} />
      <ErrorAlert message={error || err} onRetry={reload} />
      {loading ? <Loader /> : data?.length ? (
        <div className="card">
          <table className="table">
            <thead><tr><th>Title</th><th>Category</th><th>Instructor</th><th>Students</th><th>Status</th><th /></tr></thead>
            <tbody>{data.map((c) => (
              <tr key={c.id}>
                <td><Link to={`/courses/${c.id}`}>{c.title}</Link></td>
                <td>{c.category_name || "-"}</td><td>{c.instructor_name}</td><td>{c.enrollment_count}</td>
                <td><span className={`badge ${c.is_published ? "badge-ok" : "badge-warn"}`}>{c.is_published ? "Published" : "Draft"}</span></td>
                <td className="actions">
                  <Button variant="ghost" onClick={() => togglePublish(c)}>{c.is_published ? "Unpublish" : "Publish"}</Button>
                  <Link className="btn btn-secondary" to={`/manage-courses/${c.id}/edit`}>Edit</Link>
                  <Button variant="danger" onClick={() => del(c)}>Delete</Button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : !error && <Empty>No courses yet.</Empty>}
    </>
  );
}
