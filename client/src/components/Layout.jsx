import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth.jsx";

const TABS = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/orders", label: "Orders" },
  { to: "/certificates", label: "Certificates" },
  { to: "/participants", label: "BA / BP / SE" },
  { to: "/earnings", label: "Earnings" },
  { to: "/bill-tree", label: "Bill Tree" },
  { to: "/products", label: "Products" },
  { to: "/settings", label: "Settings" },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <>
      <div className="topbar">
        <div className="brand">
          ADMIN <small>DASHBOARD</small>
        </div>
        <div className="topbar-right">
          <span className="pill-owner">
            {user?.code} · {user?.role}
          </span>
          <button className="link-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      <div className="shell">
        <nav className="card tabnav">
          {TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              {t.label}
            </NavLink>
          ))}
        </nav>
        <Outlet />
      </div>
    </>
  );
}
