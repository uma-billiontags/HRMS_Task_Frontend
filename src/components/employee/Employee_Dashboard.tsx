// Employee_Dashboard.tsx
// Landing page after employee login. Shows personal stats from
// reports/employee/, plus a live "currently working on" card if a timer is
// running right now. Styled to match Active_Task_Admin.tsx: same
// StatusTag/PriorityTag, same badge-style Task ID, same StatCard with
// changeLabel/changeType.

import { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { Table, Button, message } from "antd";
import { ReloadOutlined, ArrowRightOutlined, PlayCircleOutlined, RocketOutlined } from "@ant-design/icons";
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
    total_hours: number;
    avg_rating: number | null;
}

interface QualityRow {
    quality_of_task: string;
    count: number;
}

interface ReportTask {
    id: number;
    task_id: string;
    task_name: string;
    task_status: TaskStatus;
    priority: string | null;
    total_time_taken: number;
    allotted_time: number | null;
    assigned_date: string;
    quality_of_task: string;
    rating: number | null;
}

interface ReportData {
    summary: Summary;
    by_quality: QualityRow[];
    tasks: ReportTask[];
}

interface ActiveSession {
    task: number;
    task_name: string;
    session: { id: number; start_time: string };
}

function formatElapsed(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

export default function Employee_Dashboard() {
    const { user } = useAuth();
    const [data, setData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
    const [elapsed, setElapsed] = useState(0);
    const tickRef = useRef<number | null>(null);

    const fetchAll = useCallback(() => {
        setLoading(true);
        Promise.all([
            fetch(`${BASE_URL}/api/tasks/reports/employee/`, { headers: { ...authHeaders() } }).then((r) => r.json()),
            fetch(`${BASE_URL}/api/tasks/my_active_session/`, { headers: { ...authHeaders() } }).then((r) => r.json()),
        ])
            .then(([report, session]) => {
                setData(report);
                setActiveSession(session?.active ? session : null);
            })
            .catch((err) => {
                console.error("Dashboard fetch failed:", err);
                message.error("Failed to load your dashboard");
            }).finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    useEffect(() => {
        if (tickRef.current) window.clearInterval(tickRef.current);
        if (!activeSession) return;

        const update = () => {
            const secs = dayjs().diff(dayjs(activeSession.session.start_time), "second");
            setElapsed(Math.max(0, secs));
        };
        update();
        tickRef.current = window.setInterval(update, 1000);

        return () => {
            if (tickRef.current) window.clearInterval(tickRef.current);
        };
    }, [activeSession]);

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
            title: "Status", dataIndex: "task_status", key: "task_status", width: 130,
            render: (v: TaskStatus) => <StatusTag status={v} />,
        },
        {
            title: "Time (hrs)", key: "time", width: 130,
            render: (_: any, r: ReportTask) => (
                <span className="td-num" style={{ fontSize: 12 }}>{r.total_time_taken} / {r.allotted_time ?? "—"}</span>
            ),
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
                        Here's a look at your work
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

            {/* ── Currently working on ── */}
            {activeSession ? (
                <div className="db-chart-card" style={{
                    marginBottom: 18, display: "flex", alignItems: "center", justifyContent: "space-between",
                    borderLeft: "3px solid var(--blue)",
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ color: "var(--blue)", display: "flex", fontSize: 20 }}>
                            <PlayCircleOutlined />
                        </span>
                        <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--blue)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                Currently working on
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{activeSession.task_name}</div>
                        </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <span style={{ fontSize: 20, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "var(--blue)" }}>
                            {formatElapsed(elapsed)}
                        </span>
                        <Link to="/employee/active_tasks">
                            <Button style={{ fontSize: 12, fontWeight: 600, borderRadius: 8 }}>Go to task</Button>
                        </Link>
                    </div>
                </div>
            ) : (
                <div className="db-chart-card" style={{
                    marginBottom: 18, display: "flex", alignItems: "center", gap: 12,
                    color: "var(--text-secondary)",
                }}>
                    <RocketOutlined style={{ fontSize: 16 }} />
                    <span style={{ fontSize: 13 }}>No task in progress right now.</span>
                    <Link
                        to="/employee/active_tasks"
                        style={{ fontSize: 12, fontWeight: 600, marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, color: "var(--accent)", textDecoration: "none" }}
                    >
                        View your tasks <ArrowRightOutlined />
                    </Link>
                </div>
            )}

            {/* ── Overview ── */}
            <div className="db-stat-grid">
                <StatCard label="My Total Tasks" value={data?.summary.total_tasks ?? 0} changeLabel="All time" changeType="neutral" />
                <StatCard label="Completed" value={data?.summary.completed ?? 0} changeLabel="Approved by admin" changeType="up" />
                <StatCard label="Completion Rate" value={`${data?.summary.completion_rate ?? 0}%`} changeLabel="Of your assigned tasks" changeType="up" />
                <StatCard label="Total Hours Logged" value={data?.summary.total_hours ?? 0} changeLabel="All time" changeType="neutral" />
            </div>

            {/* ── Quality breakdown ── */}
            <div className="db-grid-2">
                <div className="db-chart-card">
                    <div className="db-card-title" style={{ marginBottom: 12 }}>Quality Breakdown</div>
                    <div className="db-legend" style={{ marginTop: 0 }}>
                        {(data?.by_quality ?? []).map((row) => (
                            <div key={row.quality_of_task} className="db-badge info" style={{ fontSize: 10.5 }}>
                                {row.quality_of_task.replace(/_/g, " ")}: {row.count}
                            </div>
                        ))}
                        {(!data || data.by_quality.length === 0) && (
                            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>No reviewed tasks yet.</span>
                        )}
                    </div>
                </div>

                <div className="db-chart-card" style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 6 }}>
                    <div style={{ fontSize: 26, fontWeight: 700, color: "var(--amber)" }}>
                        {data?.summary.avg_rating != null ? `${data.summary.avg_rating}/5` : "—"}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Average Rating
                    </div>
                </div>
            </div>

            {/* ── Recent tasks ── */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div className="db-card-title">Recent Tasks</div>
                <Link to="/employee/active_tasks" style={{ fontSize: 11.5, fontWeight: 600, color: "var(--accent)", display: "flex", alignItems: "center", gap: 4, textDecoration: "none" }}>
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
                    scroll={{ x: 700 }}
                    loading={loading}
                    pagination={false}
                    rowClassName={() => "client-table-row"}
                    style={{ fontSize: 13 }}
                />
            </div>
        </div>
    );
}