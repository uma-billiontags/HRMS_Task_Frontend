// Sidebar.tsx
// One reusable sidebar for both roles — pass role="admin" or role="employee"
// and it swaps the nav config. Import it the same way you imported
// AccountManager_Sidebar in the CRM project.
//
// Usage:
//   <Sidebar role={user.role} userName={user.name} />

import { Link, useLocation, useNavigate } from "react-router-dom";
import {
    LayoutDashboard,
    ClipboardList,
    ClipboardCheck,
    CheckCircle2,
    // CheckCircle,
    XCircle,
    Archive,
    // Clock,
    History,
    BarChart3,
    Settings,
    LogOut,
    type LucideIcon,
} from "lucide-react";
import { useAuth } from "./AuthContext";

// ── Nav config ──────────────────────────────────────────────────────────────

interface NavItem {
    label: string;
    icon: LucideIcon;
    to: string;
}

interface NavGroup {
    section?: string;
    items: NavItem[];
}

const ADMIN_NAV: NavGroup[] = [
    {
        section: "OVERVIEW",
        items: [{ label: "Dashboard", icon: LayoutDashboard, to: "/admin/dashboard" }],
    },
    {
        section: "TASKS",
        items: [
            { label: "Active Tasks", icon: ClipboardList, to: "/admin/active_tasks" },
            { label: "Completed Tasks", icon: CheckCircle2, to: "/admin/completed_tasks" },
            { label: "Archive Tasks", icon: Archive, to: "/admin/archive_tasks" },
            { label: "Cancel Tasks", icon: XCircle, to: "/admin/cancel_tasks" },
            { label: "Review Tasks", icon: ClipboardCheck, to: "/admin/review_tasks" },
        ],
    },
    // {
    //     section: "REQUESTS",
    //     items: [
    //         { label: "Pending Requests", icon: Clock, to: "/admin/pending_time_correction_requests" },
    //         { label: "Approved Requests", icon: CheckCircle, to: "/admin/approved_requests" },
    //         { label: "Rejected Requests", icon: XCircle, to: "/admin/rejected_requests" },
    //     ],
    // },
    {
        section: "INSIGHTS",
        items: [
            { label: "Reports", icon: BarChart3, to: "/admin/reports" },
            { label: "Audit History", icon: History, to: "/admin/audit_history" },
        ],
    },
];

const EMPLOYEE_NAV: NavGroup[] = [
    {
        section: "OVERVIEW",
        items: [{ label: "Dashboard", icon: LayoutDashboard, to: "/employee/dashboard" }],
    },
    {
        section: "TASKS",
        items: [{ label: "All Tasks", icon: ClipboardList, to: "/employee/active_tasks" }],
    },
    // {
    //     section: "REQUESTS",
    //     items: [
    //         { label: "Approved Requests", icon: CheckCircle, to: "/employee/approved_requests" },
    //         { label: "Rejected Requests", icon: XCircle, to: "/employee/rejected_requests" },
    //     ],
    // },
    {
        section: "INSIGHTS",
        items: [
            { label: "Reports", icon: BarChart3, to: "/employee/reports" },
            { label: "Audit History", icon: History, to: "/employee/audit_history" },
        ],
    },
];

// ── Props ───────────────────────────────────────────────────────────────────

interface SidebarProps {
    role: "admin" | "employee";
    userName: string;
}

// ── Component ───────────────────────────────────────────────────────────────

export default function Sidebar({ role, userName }: SidebarProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const { logout } = useAuth();
    const nav = role === "admin" ? ADMIN_NAV : EMPLOYEE_NAV;

    function handleLogout() {
        logout();
        navigate("/login", { replace: true });
    }

    return (
        <aside className="db-sidebar">
            {/* Logo */}
            <div className="db-logo">
                <div className="db-logo-brand">
                    <div className="db-logo-icon">HR</div>
                    <span className="db-logo-name">HRMS</span>
                </div>
                <div className="db-logo-sub">{role === "admin" ? "Admin Portal" : "Employee Portal"}</div>
            </div>

            {/* Nav */}
            <nav className="db-nav">
                {nav.map((group, gi) => (
                    <div key={gi}>
                        {group.section && <div className="db-nav-section">{group.section}</div>}

                        {group.items.map((item) => {
                            const active =
                                location.pathname === item.to || location.pathname.startsWith(item.to + "/");
                            const Icon = item.icon;

                            return (
                                <Link
                                    key={item.to}
                                    to={item.to}
                                    className={`db-nav-item${active ? " active" : ""}`}
                                    style={{ textDecoration: "none" }}
                                >
                                    <span className="db-nav-icon">
                                        <Icon size={16} strokeWidth={1.8} />
                                    </span>
                                    <span className="db-nav-label">{item.label}</span>
                                </Link>
                            );
                        })}
                    </div>
                ))}
            </nav>

            {/* Footer */}
            <div className="db-sidebar-footer">
                <div className="db-sidebar-user">
                    <div className="db-sidebar-avatar">{userName.charAt(0).toUpperCase()}</div>
                    <div>
                        <div className="db-sidebar-uname">{userName}</div>
                        <div className="db-sidebar-urole">{role === "admin" ? "ADMINISTRATOR" : "EMPLOYEE"}</div>
                    </div>
                </div>

                <Link to="/settings" style={{ textDecoration: "none" }}>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "7px 10px",
                            borderRadius: 8,
                            color: "var(--text-muted)",
                            fontSize: 12,
                            fontWeight: 500,
                            cursor: "pointer",
                            marginBottom: 3,
                        }}
                    >
                        <Settings size={14} /> Settings
                    </div>
                </Link>

                <div
                    onClick={handleLogout}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "7px 10px",
                        borderRadius: 8,
                        color: "var(--red)",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                    }}
                >
                    <LogOut size={14} /> Sign Out
                </div>
            </div>
        </aside>
    );
}