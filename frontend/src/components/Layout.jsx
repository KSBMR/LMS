import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const role = user?.role;

  const onLogout = async () => { await logout().catch(() => {}); navigate("/login"); };

  return (
    <>
      <header className="navbar">
        <div className="container nav-inner">
          <NavLink to="/" className="brand">📚 LMS</NavLink>
          <nav>
            {user && <NavLink to="/dashboard">Dashboard</NavLink>}
            {user && <NavLink to="/courses">Courses</NavLink>}
            {role === "student" && <NavLink to="/my-courses">My Learning</NavLink>}
            {role === "instructor" && <NavLink to="/manage-courses">My Courses</NavLink>}
            {role === "admin" && <NavLink to="/manage-courses">Courses</NavLink>}
            {role === "admin" && <NavLink to="/categories">Categories</NavLink>}
            {role === "admin" && <NavLink to="/users">Users</NavLink>}
            {role === "admin" && <NavLink to="/reports">Reports</NavLink>}
          </nav>
          <div className="nav-right">
            {user ? (
              <>
                <NavLink to="/profile" className="user-chip">{user.first_name || user.username} <em>{user.role}</em></NavLink>
                <button className="btn btn-ghost" onClick={onLogout}>Logout</button>
              </>
            ) : (
              <>
                <NavLink to="/login">Login</NavLink>
                <NavLink to="/register" className="btn btn-primary">Sign up</NavLink>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="container"><Outlet /></main>
    </>
  );
}
