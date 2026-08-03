// Admin_Dashboard.tsx
// Landing page after admin login. Pulls the same aggregated data as
// Reports_Admin.tsx (no filters = org-wide totals) plus two lightweight
// counts — pending reviews and pending corrections — so the admin sees
// "what needs my attention today" at a glance. Styled to match
// Active_Task_Admin.tsx exactly: same StatusTag/PriorityTag, same
// badge-style Task ID, same StatCard with changeLabel/changeType.

import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Table, Button, message } from "antd";
import { ReloadOutlined, ArrowRightOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useAuth } from "../AuthContext"; // adjust path to match your project

const BASE_URL = import.meta.env.VITE_BASE_URL;

function authHeaders(): HeadersInit {
    try {
        const raw = localStorage.getItem("task_tracker_auth");
        if (!raw) return {};
        const { token } = JSON.parse(raw);
        return token ? { Authorization: `Token ${token}` } : {};
    } catch {
        return {};
    }
}

type TaskStatus =
    | "not_started" | "in_progress" | "paused" | "submitted" | "under_review"
    | "rework_needed" | "resubmitted" | "completed" | "on_hold" | "cancelled" | "archived";

const STATUS_META: Record<TaskStatus, { label: string; color: string; bg: string }> = {
    not_started: { label: "Not Started", color: "var(--text-secondary)", bg: "var(--bg-input)" },
    in_progress: { label: "In Progress", color: "var(--blue)", bg: "var(--blue-bg)" },
    paused: { label: "Paused", color: "var(--amber)", bg: "var(--amber-bg)" },
    submitted: { label: "Submitted", color: "var(--purple)", bg: "var(--purple-bg)" },
    under_review: { label: "Under Review", color: "var(--purple)", bg: "var(--purple-bg)" },
    rework_needed: { label: "Rework Needed", color: "var(--red)", bg: "var(--red-bg)" },
    resubmitted: { label: "Resubmitted", color: "var(--amber)", bg: "var(--amber-bg)" },
    completed: { label: "Completed", color: "var(--green)", bg: "var(--green-bg)" },
    on_hold: { label: "On Hold", color: "var(--amber)", bg: "var(--amber-bg)" },
    cancelled: { label: "Cancelled", color: "var(--red)", bg: "var(--red-bg)" },
    archived: { label: "Archived", color: "var(--text-muted)", bg: "var(--bg-input)" },
};

const PRIORITY_COLOR: Record<string, { color: string; bg: string }> = {
    low: { color: "var(--green)", bg: "var(--green-bg)" },
    medium: { color: "var(--blue)", bg: "var(--blue-bg)" },
    high: { color: "var(--amber)", bg: "var(--amber-bg)" },
    urgent: { color: "var(--red)", bg: "var(--red-bg)" },
};

function StatusTag({ status }: { status: TaskStatus }) {
    const meta = STATUS_META[status] ?? STATUS_META.not_started;
    return (
        <span style={{
            fontSize: 10.5, fontWeight: 700, padding: "3px 9px", borderRadius: 10,
            color: meta.color, background: meta.bg, whiteSpace: "nowrap",
        }}>
            {meta.label}
        </span>
    );
}

function PriorityTag({ priority }: { priority: string | null }) {
    if (!priority) return <span style={{ color: "var(--text-muted)", fontSize: 12 }}>—</span>;
    const meta = PRIORITY_COLOR[priority] ?? { color: "var(--text-secondary)", bg: "var(--bg-input)" };
    return (
        <span style={{
            fontSize: 10.5, fontWeight: 700, padding: "3px 9px", borderRadius: 10,
            color: meta.color, background: meta.bg, textTransform: "capitalize", whiteSpace: "nowrap",
        }}>
            {priority}
        </span>
    );
}

function StatCard({ label, value, changeLabel, changeType }: {
    label: string; value: number | string; changeLabel: string; changeType: "up" | "down" | "neutral";
}) {
    return (
        <div className="db-stat-card">
            <div className="db-stat-label">{label}</div>
            <div className="db-stat-value">{value}</div>
            <div
                className={`db-stat-change ${changeType === "neutral" ? "" : changeType}`}
                style={changeType === "neutral" ? { color: "var(--text-secondary)" } : undefined}
            >
                {changeLabel}
            </div>
        </div>
    );
}

interface Summary {
    total_tasks: number;
    completed: number;
    completion_rate: number;
    overdue: number;
    total_hours: number;
    avg_rating: number | null;
}

interface ByEmployeeRow {
    assigned_to__name: string;
    count: number;
    hours: number | null;
}

interface ByStatusRow {
    task_status: TaskStatus;
    count: number;
}

interface ReportTask {
    id: number;
    task_id: string;
    task_name: string;
    assigned_to_name: string | null;
    priority: string | null;
    task_status: TaskStatus;
    total_time_taken: number;
    allotted_time: number | null;
    assigned_date: string;
}

interface ReportData {
    summary: Summary;
    by_employee: ByEmployeeRow[];
    by_status: ByStatusRow[];
    tasks: ReportTask[];
}

export default function Admin_Dashboard() {
    const { user } = useAuth();
    const [data, setData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);
    const [pendingReviewCount, setPendingReviewCount] = useState(0);
    const [pendingCorrectionCount, setPendingCorrectionCount] = useState(0);

    const fetchAll = useCallback(() => {
        setLoading(true);
        Promise.all([
            fetch(`${BASE_URL}/api/tasks/reports/admin/`, { headers: { ...authHeaders() } }).then((r) => r.json()),
            fetch(`${BASE_URL}/api/tasks/review_tasks/`, { headers: { ...authHeaders() } }).then((r) => r.json()),
            fetch(`${BASE_URL}/api/tasks/corrections/pending/`, { headers: { ...authHeaders() } }).then((r) => r.json()),
        ])
            .then(([report, reviewQueue, corrections]) => {
                setData(report);
                setPendingReviewCount(Array.isArray(reviewQueue) ? reviewQueue.length : 0);
                setPendingCorrectionCount(Array.isArray(corrections) ? corrections.length : 0);
            })
            .catch(() => message.error("Failed to load dashboard data"))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    const inProgressCount = data?.by_status.find((s) => s.task_status === "in_progress")?.count ?? 0;
    const unassignedCount = data?.tasks.filter((t) => !t.assigned_to_name).length ?? 0;
    const maxByEmployee = Math.max(1, ...(data?.by_employee.map((r) => r.count) ?? [1]));
    const recentTasks = (data?.tasks ?? []).slice(0, 8);

    const columns: ColumnsType<ReportTask> = [
        {
            title: "Task ID", dataIndex: "task_id", key: "task_id", width: 100,
            render: (v: string) => (
                <span style={{
                    fontSize: 11.5, fontWeight: 700, color: "var(--blue)", background: "var(--blue-bg)",
                    border: "1px solid var(--blue)", padding: "2px 10px", borderRadius: 6, whiteSpace: "nowrap",
                }}>
                    {v}
                </span>
            ),
        },
        {
            title: "Task", dataIndex: "task_name", key: "task_name",
            render: (v: string) => <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{v}</span>,
        },
        {
            title: "Assigned To", dataIndex: "assigned_to_name", key: "assigned_to_name", width: 140,
            render: (v: string | null) => (
                v
                    ? <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-primary)" }}>{v}</span>
                    : <span style={{ color: "var(--text-muted)", fontSize: 12 }}>Unassigned</span>
            ),
        },
        {
            title: "Priority", dataIndex: "priority", key: "priority", width: 100,
            render: (v: string | null) => <PriorityTag priority={v} />,
        },
        {
            title: "Status", dataIndex: "task_status", key: "task_status", width: 130,
            render: (v: TaskStatus) => <StatusTag status={v} />,
        },
        {
            title: "Assigned Date", dataIndex: "assigned_date", key: "assigned_date", width: 120,
            render: (v: string) => (
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{dayjs(v).format("DD MMM YYYY")}</span>
            ),
        },
    ];

    return (
        <div>
            <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                marginBottom: 18, borderBottom: "1px solid var(--border)", paddingBottom: 8,
            }}>
                <div>
                    <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "var(--accent)" }}>
                        Welcome back{user?.name ? `, ${user.name}` : ""}
                    </h1>
                    <p style={{
                        fontSize: 9, color: "var(--text-muted)", margin: "4px 0 0",
                        fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase",
                    }}>
                        Here's what's happening across your team today
                    </p>
                </div>
                <Button
                    onClick={fetchAll}
                    icon={<ReloadOutlined />}
                    className="db-card-action"
                    style={{ height: 35, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, paddingInline: 14 }}
                >
                    Refresh
                </Button>
            </div>

            {/* ── Overview ── */}
            <div className="db-stat-grid">
                <StatCard label="Active Tasks" value={data?.summary.total_tasks ?? 0} changeLabel="Across your team" changeType="neutral" />
                <StatCard label="Completion Rate" value={`${data?.summary.completion_rate ?? 0}%`} changeLabel="Of all assigned tasks" changeType="up" />
                <StatCard label="Overdue" value={data?.summary.overdue ?? 0} changeLabel="Past due date" changeType={data && data.summary.overdue > 0 ? "down" : "neutral"} />
                <StatCard label="Total Hours Logged" value={data?.summary.total_hours ?? 0} changeLabel="All time" changeType="neutral" />
            </div>

            {/* ── Needs attention ── */}
            <div className="db-stat-grid">
                <StatCard label="In Progress" value={inProgressCount} changeLabel="Currently active" changeType="up" />
                <StatCard label="Pending Review" value={pendingReviewCount} changeLabel="Awaiting your decision" changeType={pendingReviewCount > 0 ? "down" : "neutral"} />
                <StatCard label="Pending Corrections" value={pendingCorrectionCount} changeLabel="Time fixes to review" changeType={pendingCorrectionCount > 0 ? "down" : "neutral"} />
                <StatCard label="Unassigned" value={unassignedCount} changeLabel="Awaiting assignment" changeType={unassignedCount > 0 ? "down" : "neutral"} />
            </div>

            {/* ── Breakdown ── */}
            <div className="db-grid-2">
                <div className="db-chart-card">
                    <div className="db-card-title" style={{ marginBottom: 12 }}>Tasks by Employee</div>
                    {(data?.by_employee ?? []).slice(0, 6).map((row) => (
                        <div key={row.assigned_to__name} className="db-progress-row">
                            <div className="db-progress-top">
                                <span className="db-progress-label">{row.assigned_to__name}</span>
                                <span className="db-progress-value">{row.count} · {row.hours ?? 0}h</span>
                            </div>
                            <div className="db-progress-bar">
                                <div className="db-progress-fill" style={{ width: `${(row.count / maxByEmployee) * 100}%` }} />
                            </div>
                        </div>
                    ))}
                    {(!data || data.by_employee.length === 0) && (
                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>No data yet.</span>
                    )}
                </div>

                <div className="db-chart-card">
                    <div className="db-card-title" style={{ marginBottom: 12 }}>Tasks by Status</div>
                    <div className="db-legend" style={{ marginTop: 0 }}>
                        {(data?.by_status ?? []).map((row) => (
                            <div key={row.task_status} className="db-badge info" style={{ fontSize: 10.5 }}>
                                {STATUS_META[row.task_status]?.label ?? row.task_status.replace(/_/g, " ")}: {row.count}
                            </div>
                        ))}
                    </div>
                    {data?.summary.avg_rating != null && (
                        <div style={{ marginTop: 16, fontSize: 12, color: "var(--text-secondary)" }}>
                            Average rating across reviewed tasks: <b style={{ color: "var(--text-primary)" }}>{data.summary.avg_rating}/5</b>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Recent tasks ── */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div className="db-card-title">Recent Tasks</div>
                <Link to="/admin/active_tasks" style={{ fontSize: 11.5, fontWeight: 600, color: "var(--accent)", display: "flex", alignItems: "center", gap: 4, textDecoration: "none" }}>
                    View all <ArrowRightOutlined />
                </Link>
            </div>
            <div style={{
                background: "var(--bg-card)", borderRadius: 14, border: "1px solid var(--border)",
                overflow: "hidden", boxShadow: "var(--shadow-card)",
            }}>
                <Table
                    columns={columns}
                    dataSource={recentTasks}
                    rowKey="id"
                    scroll={{ x: 900 }}
                    loading={loading}
                    pagination={false}
                    rowClassName={() => "client-table-row"}
                    style={{ fontSize: 13 }}
                />
            </div>
        </div>
    );
}