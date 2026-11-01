import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Empty, ErrorAlert, Loader, PageHeader, StatCard } from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import useFetch from "../hooks/useFetch.js";

export const COLORS = ["#4f46e5", "#06b6d4", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6"];

export default function Dashboard() {
  const { user } = useAuth();
  const { data: d, loading, error, reload } = useFetch("/dashboard/");

  if (loading) return <Loader />;
  if (error) return <ErrorAlert message={error} onRetry={reload} />;

  return (
    <>
      <PageHeader title={`Hello, ${user.first_name || user.username} 👋`} />
      {d.role === "admin" && <AdminView d={d} />}
      {d.role === "instructor" && <InstructorView d={d} />}
      {d.role === "student" && <StudentView d={d} />}
    </>
  );
}

function AdminView({ d }) {
  const roles = Object.entries(d.role_counts).map(([name, value]) => ({ name, value }));
  return (
    <>
      <div className="stats">
        <StatCard label="Total users" value={d.total_users} />
        <StatCard label="Total courses" value={d.total_courses} accent="#06b6d4" />
        <StatCard label="Enrollments" value={d.total_enrollments} accent="#f59e0b" />
        <StatCard label="Completed" value={d.completed_enrollments} accent="#10b981" />
        <StatCard label="Categories" value={d.total_categories} accent="#8b5cf6" />
      </div>
      <div className="grid-2 align-start">
        <div className="card pad">
          <h3>Users by role</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={roles} dataKey="value" nameKey="name" outerRadius={85} label>
                {roles.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="card pad">
          <h3>Recent enrollments</h3>
          {d.recent_enrollments.length ? (
            <table className="table">
              <thead><tr><th>Student</th><th>Course</th><th>Status</th></tr></thead>
              <tbody>{d.recent_enrollments.map((e) => (
                <tr key={e.id}><td>{e.student_name}</td><td>{e.course_title}</td><td>{e.status}</td></tr>
              ))}</tbody>
            </table>
          ) : <Empty>No enrollments yet.</Empty>}
          <p className="small"><Link to="/reports">View full reports →</Link></p>
        </div>
      </div>
    </>
  );
}

function InstructorView({ d }) {
  return (
    <>
      <div className="stats">
        <StatCard label="My courses" value={d.total_courses} />
        <StatCard label="Published" value={d.published_courses} accent="#10b981" />
        <StatCard label="Enrollments" value={d.total_enrollments} accent="#f59e0b" />
        <StatCard label="Unique students" value={d.total_students} accent="#06b6d4" />
      </div>
      <div className="card pad">
        <h3>Enrollments per course</h3>
        {d.courses.length ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={d.courses}>
              <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="title" /><YAxis allowDecimals={false} /><Tooltip />
              <Bar dataKey="enrollment_count" name="Enrolled" fill="#4f46e5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <Empty>Create your first course to see stats. <Link to="/manage-courses/new">New course</Link></Empty>}
      </div>
    </>
  );
}

function StudentView({ d }) {
  return (
    <>
      <div className="stats">
        <StatCard label="Enrolled courses" value={d.total_enrollments} />
        <StatCard label="In progress" value={d.in_progress} accent="#f59e0b" />
        <StatCard label="Completed" value={d.completed_courses} accent="#10b981" />
        <StatCard label="Courses available" value={d.available_courses} accent="#06b6d4" />
      </div>
      <div className="card pad">
        <h3>Continue learning</h3>
        {d.enrollments.length ? d.enrollments.map((e) => (
          <div key={e.id} style={{ margin: "10px 0" }}>
            <Link to={`/courses/${e.course}`}>{e.course_title}</Link>
            <div className="bar"><i style={{ width: `${e.progress}%` }} /></div>
          </div>
        )) : <Empty>Nothing yet. <Link to="/courses">Find a course</Link></Empty>}
      </div>
    </>
  );
}
