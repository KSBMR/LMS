import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api, { errMsg } from "../api/client.js";
import { Button, ErrorAlert, Loader, PageHeader, SuccessAlert } from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import useFetch from "../hooks/useFetch.js";

export default function CourseDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: course, loading, error, reload } = useFetch(`/courses/${id}/`);
  const canManage = course && (user.role === "admin" || (user.role === "instructor" && course.instructor === user.id));
  const roster = useFetch(canManage ? `/courses/${id}/students/` : null, undefined, [canManage]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(""); const [err, setErr] = useState("");

  const act = async (path, okMsg) => {
    setBusy(true); setMsg(""); setErr("");
    try { await api.post(`/courses/${id}/${path}/`); setMsg(okMsg); reload(); }
    catch (e) { setErr(errMsg(e)); } finally { setBusy(false); }
  };

  const del = async () => {
    if (!window.confirm("Delete this course permanently?")) return;
    try { await api.delete(`/courses/${id}/`); navigate("/manage-courses"); } catch (e) { setErr(errMsg(e)); }
  };

  if (loading) return <Loader />;
  if (error) return <ErrorAlert message={error} onRetry={reload} />;

  return (
    <>
      <PageHeader title={course.title} actions={canManage && (
        <>
          <Link className="btn btn-secondary" to={`/manage-courses/${id}/edit`}>Edit</Link>
          <Button variant="danger" onClick={del}>Delete</Button>
        </>
      )} />
      <ErrorAlert message={err} /><SuccessAlert message={msg} />
      <div className="grid-main">
        <div className="card pad">
          <div className="badges">
            {course.category_name && <span className="badge">{course.category_name}</span>}
            <span className="badge badge-muted">{course.level}</span>
            {!course.is_published && <span className="badge badge-warn">Draft</span>}
          </div>
          <p style={{ whiteSpace: "pre-wrap" }}>{course.description}</p>
        </div>
        <aside className="card pad">
          {course.thumbnail_url && <img className="detail-img" src={course.thumbnail_url} alt="" />}
          <ul className="meta">
            <li><b>Instructor</b><span>{course.instructor_name}</span></li>
            <li><b>Duration</b><span>{course.duration_hours} h</span></li>
            <li><b>Price</b><span>{Number(course.price) ? `$${course.price}` : "Free"}</span></li>
            <li><b>Enrolled</b><span>{course.enrollment_count}</span></li>
          </ul>
          {user.role === "student" && (course.is_enrolled
            ? <Button variant="secondary" loading={busy} onClick={() => act("unenroll", "You have left this course.")}>Unenroll</Button>
            : <Button loading={busy} onClick={() => act("enroll", "Enrolled successfully!")}>Enroll now</Button>)}
        </aside>
      </div>

      {canManage && (
        <section className="card pad" style={{ marginTop: 20 }}>
          <h3>Enrolled students</h3>
          {roster.loading ? <Loader /> : roster.data?.length ? (
            <table className="table">
              <thead><tr><th>Student</th><th>Email</th><th>Status</th><th>Progress</th></tr></thead>
              <tbody>{roster.data.map((e) => (
                <tr key={e.id}><td>{e.student_name}</td><td>{e.student_email}</td><td>{e.status}</td>
                  <td><div className="bar"><i style={{ width: `${e.progress}%` }} /></div> {e.progress}%</td></tr>
              ))}</tbody>
            </table>
          ) : <p className="muted">No students yet.</p>}
        </section>
      )}
    </>
  );
}
