import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Empty, ErrorAlert, Loader, PageHeader, StatCard } from "../components/ui.jsx";
import useFetch from "../hooks/useFetch.js";

export default function Reports() {
  const users = useFetch("/reports/users/");
  const courses = useFetch("/reports/courses/");
  const enr = useFetch("/reports/enrollments/");

  const loading = users.loading || courses.loading || enr.loading;
  const error = users.error || courses.error || enr.error;
  const reload = () => { users.reload(); courses.reload(); enr.reload(); };

  if (loading) return <Loader />;
  if (error) return <ErrorAlert message={error} onRetry={reload} />;

  const u = users.data, c = courses.data, e = enr.data;
  return (
    <>
      <PageHeader title="Reports" />
      <div className="stats">
        <StatCard label="Total users" value={u.total_users} />
        <StatCard label="Active users" value={u.active_users} accent="#10b981" />
        <StatCard label="Courses" value={c.total_courses} accent="#06b6d4" />
        <StatCard label="Enrollments" value={e.total_enrollments} accent="#f59e0b" />
        <StatCard label="Avg progress" value={`${e.average_progress}%`} accent="#8b5cf6" />
      </div>

      <div className="grid-2 align-start">
        <div className="card pad">
          <h3>Enrollments per month</h3>
          {e.monthly.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={e.monthly}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis allowDecimals={false} /><Tooltip />
                <Line type="monotone" dataKey="count" stroke="#4f46e5" strokeWidth={2} /></LineChart>
            </ResponsiveContainer>
          ) : <Empty>No data.</Empty>}
        </div>
        <div className="card pad">
          <h3>Courses by category</h3>
          {c.by_category.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={c.by_category}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip />
                <Bar dataKey="course_total" name="Courses" fill="#06b6d4" radius={[4, 4, 0, 0]} /></BarChart>
            </ResponsiveContainer>
          ) : <Empty>No data.</Empty>}
        </div>
      </div>

      <div className="grid-2 align-start">
        <div className="card pad">
          <h3>Role-wise users</h3>
          <table className="table"><thead><tr><th>Role</th><th>Users</th></tr></thead>
            <tbody>{Object.entries(u.role_counts).map(([r, n]) => <tr key={r}><td>{r}</td><td>{n}</td></tr>)}</tbody></table>
          <h3>Enrollment status</h3>
          <table className="table"><thead><tr><th>Status</th><th>Count</th></tr></thead>
            <tbody>{e.by_status.map((s) => <tr key={s.status}><td>{s.status}</td><td>{s.count}</td></tr>)}</tbody></table>
        </div>
        <div className="card pad">
          <h3>Enrollments per course</h3>
          <table className="table"><thead><tr><th>Course</th><th>Students</th></tr></thead>
            <tbody>{e.per_course.length ? e.per_course.map((r) => <tr key={r.course__id}><td>{r.course__title}</td><td>{r.count}</td></tr>)
              : <tr><td colSpan={2} className="muted">No data</td></tr>}</tbody></table>
        </div>
      </div>
    </>
  );
}
