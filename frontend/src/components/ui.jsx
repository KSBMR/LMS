import { Link } from "react-router-dom";

export const Loader = ({ text = "Loading..." }) => (
  <div className="loader"><span className="spinner" /> {text}</div>
);

export const ErrorAlert = ({ message, onRetry }) =>
  message ? (
    <div className="alert alert-error" role="alert">
      {message} {onRetry && <button className="link-btn" onClick={onRetry}>Retry</button>}
    </div>
  ) : null;

export const SuccessAlert = ({ message }) => (message ? <div className="alert alert-ok">{message}</div> : null);

export function FormField({ label, error, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}

export const Input = (props) => <input {...props} />;

export function Button({ loading, children, variant = "primary", ...rest }) {
  return (
    <button className={`btn btn-${variant}`} disabled={loading || rest.disabled} {...rest}>
      {loading ? "Please wait..." : children}
    </button>
  );
}

export const StatCard = ({ label, value, accent }) => (
  <div className="stat-card" style={{ borderTopColor: accent || "var(--primary)" }}>
    <div className="stat-value">{value ?? "-"}</div>
    <div className="stat-label">{label}</div>
  </div>
);

export const Empty = ({ children }) => <div className="empty">{children}</div>;

export function PageHeader({ title, actions }) {
  return (
    <div className="page-header">
      <h1>{title}</h1>
      <div className="actions">{actions}</div>
    </div>
  );
}

export function CourseCard({ course }) {
  return (
    <div className="card course-card">
      <div className="thumb" style={course.thumbnail_url ? { backgroundImage: `url(${course.thumbnail_url})` } : undefined}>
        {!course.thumbnail_url && <span>{course.title.slice(0, 1)}</span>}
      </div>
      <div className="card-body">
        <div className="badges">
          {course.category_name && <span className="badge">{course.category_name}</span>}
          <span className="badge badge-muted">{course.level}</span>
          {!course.is_published && <span className="badge badge-warn">Draft</span>}
        </div>
        <h3><Link to={`/courses/${course.id}`}>{course.title}</Link></h3>
        <p className="muted clamp">{course.description}</p>
        <div className="row-between muted small">
          <span>By {course.instructor_name}</span>
          <span>{course.enrollment_count} enrolled</span>
        </div>
        {course.is_enrolled && <span className="badge badge-ok">Enrolled</span>}
      </div>
    </div>
  );
}
