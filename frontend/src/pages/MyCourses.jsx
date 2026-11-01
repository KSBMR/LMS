import { useState } from "react";
import { Link } from "react-router-dom";
import api, { errMsg } from "../api/client.js";
import { Empty, ErrorAlert, Loader, PageHeader } from "../components/ui.jsx";
import useFetch from "../hooks/useFetch.js";

export default function MyCourses() {
  const { data, loading, error, reload } = useFetch("/enrollments/");
  const [err, setErr] = useState("");

  const setProgress = async (id, progress) => {
    setErr("");
    try { await api.patch(`/enrollments/${id}/`, { progress }); reload(); } catch (e) { setErr(errMsg(e)); }
  };

  const rows = (data || []).filter((e) => e.status !== "dropped");
  return (
    <>
      <PageHeader title="My learning" />
      <ErrorAlert message={error || err} onRetry={reload} />
      {loading ? <Loader /> : rows.length ? (
        <div className="stack">
          {rows.map((e) => (
            <div className="card pad row-between" key={e.id}>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0 }}><Link to={`/courses/${e.course}`}>{e.course_title}</Link></h3>
                <div className="bar" style={{ margin: "8px 0" }}><i style={{ width: `${e.progress}%` }} /></div>
                <span className="small muted">{e.progress}% · {e.status}</span>
              </div>
              <div className="actions">
                <input type="range" min="0" max="100" step="10" value={e.progress} onChange={(ev) => setProgress(e.id, Number(ev.target.value))} />
              </div>
            </div>
          ))}
        </div>
      ) : !error && <Empty>You haven't enrolled in any course yet. <Link to="/courses">Browse courses</Link></Empty>}
    </>
  );
}
