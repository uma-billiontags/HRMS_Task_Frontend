// Archive.tsx
// Admin-only — lists every task with task_status === "archived". Read-only:
// no timer actions, no assign/hold/cancel here, since these tasks are done
// with. Reuses the same fetch pattern as Task_Display.tsx but calls
// get_all_tasks with include_archived=true and filters client-side to just
// the archived ones (keeps this page independent of whatever the main
// Task_Display list currently shows).

import { useEffect, useState, useCallback, useMemo } from "react";
import { Table, Button, Input, message } from "antd";
import { SearchOutlined, ReloadOutlined, InboxOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

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

interface ArchivedTask {
    id: number;
    task_id: string;
    task_name: string;
    task_details: string;
    department_name: string | null;
    assigned_to_name: string | null;
    assigned_by_name: string | null;
    priority: string | null;
    assigned_date: string;
    due_date: string | null;
    allotted_time: number | null;
    total_time_taken: number;
    task_status: string; // "completed" or "cancelled" before archiving — kept for context
    quality_of_task: string;
    rating: number | null;
    reviewed_date: string | null;
    rework_count: number;
}

// ── Same palette used on Active_Task_Admin's PriorityTag ──
const PRIORITY_COLOR: Record<string, { color: string; bg: string }> = {
    low: { color: "var(--green)", bg: "var(--green-bg)" },
    medium: { color: "var(--blue)", bg: "var(--blue-bg)" },
    high: { color: "var(--amber)", bg: "var(--amber-bg)" },
    urgent: { color: "var(--red)", bg: "var(--red-bg)" },
};

// ── Quality-of-task outcome, styled like Active_Task_Admin's StatusTag ──
const QUALITY_META: Record<string, { label: string; color: string; bg: string }> = {
    excellent: { label: "Excellent", color: "var(--green)", bg: "var(--green-bg)" },
    good: { label: "Good", color: "var(--green)", bg: "var(--green-bg)" },
    average: { label: "Average", color: "var(--amber)", bg: "var(--amber-bg)" },
    below_average: { label: "Below Average", color: "var(--red)", bg: "var(--red-bg)" },
    poor: { label: "Poor", color: "var(--red)", bg: "var(--red-bg)" },
};

function QualityTag({ quality }: { quality: string }) {
    if (!quality) return <span style={{ color: "var(--text-muted)", fontSize: 12 }}>N/A</span>;
    const meta = QUALITY_META[quality] ?? {
        label: quality.replace(/_/g, " "),
        color: "var(--text-secondary)",
        bg: "var(--bg-input)",
    };
    return (
        <span style={{
            fontSize: 10.5, fontWeight: 700, padding: "3px 9px", borderRadius: 10,
            color: meta.color, background: meta.bg, textTransform: "capitalize", whiteSpace: "nowrap",
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

export default function Archive_Task_Admin() {
    const [tasks, setTasks] = useState<ArchivedTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    const fetchArchived = useCallback(() => {
        setLoading(true);
        // include_archived=true bypasses the default exclude() in get_all_tasks —
        // see tasks/views.py's get_all_tasks, which otherwise hides these.
        fetch(`${BASE_URL}/api/tasks/get_all_tasks/?include_archived=true`, {
            headers: { ...authHeaders() },
        })
            .then((r) => r.json())
            .then((d) => {
                const all: ArchivedTask[] = Array.isArray(d) ? d : d.results || [];
                setTasks(all.filter((t: any) => t.task_status === "archived" || t.archived));
            })
            .catch(() => message.error("Failed to load archived tasks"))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        fetchArchived();
    }, [fetchArchived]);

    const filtered = useMemo(() => {
        if (!search.trim()) return tasks;
        const q = search.toLowerCase();
        return tasks.filter((t) =>
            [t.task_id, t.task_name, t.assigned_to_name, t.department_name].some((f) =>
                f?.toLowerCase().includes(q)
            )
        );
    }, [tasks, search]);

    const totalArchived = tasks.length;

    const columns: ColumnsType<ArchivedTask> = [
        {
            title: "Task ID",
            dataIndex: "task_id",
            key: "task_id",
            width: 100,
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
            title: "Task",
            key: "task_name",
            width: 220,
            render: (_: any, record: ArchivedTask) => (
                <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                        {record.task_name}
                    </div>
                    {record.task_details && (
                        <div style={{
                            fontSize: 11, color: "var(--text-secondary)", marginTop: 2,
                            maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                            {record.task_details}
                        </div>
                    )}
                </div>
            ),
        },
        {
            title: "Department",
            dataIndex: "department_name",
            key: "department_name",
            width: 130,
            render: (v: string | null) => (
                v ? (
                    <span style={{
                        fontSize: 11, fontWeight: 600, color: "var(--amber)", background: "var(--amber-bg)",
                        border: "1px solid var(--amber)", padding: "2px 10px", borderRadius: 6, whiteSpace: "nowrap",
                    }}>
                        {v}
                    </span>
                ) : <span style={{ color: "var(--text-muted)", fontSize: 12 }}>—</span>
            ),
        },
        {
            title: "Assigned To",
            dataIndex: "assigned_to_name",
            key: "assigned_to_name",
            width: 130,
            render: (v: string | null) => (
                v
                    ? <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-primary)" }}>{v}</span>
                    : <span style={{ color: "var(--text-muted)", fontSize: 12 }}>Unassigned</span>
            ),
        },
        {
            title: "Priority",
            dataIndex: "priority",
            key: "priority",
            width: 100,
            render: (v: string | null) => <PriorityTag priority={v} />,
        },
        {
            title: "Final Outcome",
            key: "outcome",
            width: 130,
            render: (_: any, record: ArchivedTask) => <QualityTag quality={record.quality_of_task} />,
        },
        {
            title: "Rating",
            dataIndex: "rating",
            key: "rating",
            width: 80,
            render: (v: number | null) => (
                <span className="td-num" style={{ fontSize: 12 }}>{v ? `${v}/5` : "—"}</span>
            ),
        },
        {
            title: "Total Time (hrs)",
            dataIndex: "total_time_taken",
            key: "total_time_taken",
            width: 120,
            render: (v: number) => <span className="td-num" style={{ fontSize: 12 }}>{v}</span>,
        },
        {
            title: "Allotted (hrs)",
            dataIndex: "allotted_time",
            key: "allotted_time",
            width: 110,
            render: (v: number | null) => (
                <span className="td-num" style={{ fontSize: 12 }}>{v ?? "—"}</span>
            ),
        },
        {
            title: "Rework Count",
            dataIndex: "rework_count",
            key: "rework_count",
            width: 100,
            render: (v: number) => <span className="td-num" style={{ fontSize: 12 }}>{v}</span>,
        },
        {
            title: "Reviewed Date",
            dataIndex: "reviewed_date",
            key: "reviewed_date",
            width: 140,
            render: (v: string | null) => (
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    {v ? dayjs(v).format("DD MMM YYYY, HH:mm") : "—"}
                </span>
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
                    <h1 style={{
                        fontSize: 18, fontWeight: 700, margin: 0, color: "var(--accent)",
                        display: "flex", alignItems: "center", gap: 8,
                    }}>
                        <InboxOutlined />
                        Archived Tasks
                    </h1>
                    <p style={{
                        fontSize: 9, color: "var(--text-muted)", margin: "4px 0 0",
                        fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase",
                    }}>
                        Historical record — read only
                    </p>
                </div>
            </div>

            <div className="db-stat-grid">
                <StatCard
                    label="Total Archived"
                    value={totalArchived}
                    changeLabel="Completed / cancelled tasks on file"
                    changeType="neutral"
                />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
                <Input
                    placeholder="Search archived tasks…"
                    prefix={<SearchOutlined style={{ color: "var(--text-muted)" }} />}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    allowClear
                    style={{
                        flex: 1, minWidth: 220, maxWidth: 500, height: 35, padding: "0 14px",
                        background: "var(--bg-input)", border: "1px solid var(--accent-light)",
                        borderRadius: 9, color: "var(--text-primary)", fontSize: 13, outline: "none",
                    }}
                />
                <Button
                    onClick={fetchArchived}
                    icon={<ReloadOutlined />}
                    className="db-card-action"
                    style={{ height: 35, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, paddingInline: 14 }}
                >
                    Refresh
                </Button>
                <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: "auto" }}>
                    {filtered.length} of {tasks.length} archived
                </span>
            </div>

            <div style={{
                background: "var(--bg-card)", borderRadius: 14, border: "1px solid var(--border)",
                overflow: "hidden", boxShadow: "var(--shadow-card)",
            }}>
                <Table
                    columns={columns}
                    dataSource={filtered}
                    rowKey="id"
                    scroll={{ x: 1300 }}
                    loading={loading}
                    pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                        pageSizeOptions: ["10", "20", "50"],
                        showTotal: (total, range) => `${range[0]}–${range[1]} of ${total} archived`,
                        style: { padding: "12px 16px", color: "var(--text-primary)" },
                    }}
                    rowClassName={() => "client-table-row"}
                    style={{ fontSize: 13 }}
                />
            </div>
        </div>
    );
}