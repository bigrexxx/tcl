import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ToastProvider, useToast } from "@/lib/tcl-toast";
import {
  adminVerifyPassword,
  adminCheckSession,
  adminListRegistrations,
  adminListBookings,
  adminUpdateBookingStatus,
  adminUpdateRegistrationStatus,
  adminUpdateSettings,
  adminListHistory,
} from "@/lib/tcl-admin.functions";
import {
  getSiteContent,
  adminUpsertCommittee,
  adminDeleteCommittee,
  adminUpsertTeam,
  adminDeleteTeam,
} from "@/lib/tcl-content.functions";
import { supabase } from "@/integrations/supabase/client";
import { getPublicSettings, type PublicSettings } from "@/lib/tcl-backend.functions";
import { DEFAULT_PUBLIC_SETTINGS } from "@/lib/tcl-config";
import { ADMIN_SESSION_COOKIE_NAME } from "@/lib/tcl-admin-auth";
import placeholderImg from "@/assets/tcl-og.jpg";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — TCL Babcock" },
      { name: "description", content: "Internal management dashboard for TCL Babcock." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => (
    <ToastProvider>
      <AdminGate />
    </ToastProvider>
  ),
});

// ─── Gate ────────────────────────────────────────────────────────────────────

function AdminGate() {
  const verify = useServerFn(adminVerifyPassword);
  const checkSession = useServerFn(adminCheckSession);
  const [username, setUsername] = useState("");
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") { setChecking(false); return; }
    checkSession()
      .then((res) => {
        if (res.ok) {
          setAuthenticated(true);
          if (res.username) setUsername(res.username);
        }
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [checkSession]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await verify({ data: { username, password: input } });
    if (res.ok) {
      const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `${ADMIN_SESSION_COOKIE_NAME}=${encodeURIComponent(res.token)}; path=/; max-age=3600; sameSite=Strict${secure}`;
      setAuthenticated(true);
    } else {
      setError("Incorrect username or password.");
    }
  }

  if (checking) {
    return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: "var(--muted)" }}>Loading…</div>;
  }

  if (!authenticated) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "2rem", background: "var(--bg, #0b0b10)" }}>
        <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: 380, background: "rgba(255,255,255,0.04)", padding: "2rem", borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="logo-box-sm" style={{ marginBottom: "1rem" }}>TCL</div>
          <h2 style={{ color: "var(--white, #fff)", marginBottom: "0.5rem" }}>Admin sign-in</h2>
          <p style={{ color: "var(--muted, #aaa)", marginBottom: "1.5rem", fontSize: "0.9rem" }}>Enter your admin credentials to access the TCL Babcock dashboard.</p>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            autoFocus
            autoComplete="username"
            style={{ width: "100%", padding: "0.75rem 1rem", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.3)", color: "var(--white, #fff)", marginBottom: "0.75rem", boxSizing: "border-box" }}
          />
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            style={{ width: "100%", padding: "0.75rem 1rem", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.3)", color: "var(--white, #fff)", marginBottom: "1rem", boxSizing: "border-box" }}
          />
          {error && <div style={{ color: "#ef4444", fontSize: "0.85rem", marginBottom: "0.75rem" }}>{error}</div>}
          <button type="submit" className="btn-primary" style={{ width: "100%" }}>Sign in</button>
          <div style={{ marginTop: "1rem", textAlign: "center" }}>
            <Link to="/" style={{ color: "var(--muted, #aaa)", fontSize: "0.85rem" }}>← Back to site</Link>
          </div>
        </form>
      </div>
    );
  }

  return <AdminPage username={username} onSignOut={() => {
    const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${ADMIN_SESSION_COOKIE_NAME}=; path=/; max-age=0; sameSite=Strict${secure}`;
    setUsername("");
    setAuthenticated(false);
  }} />;
}

// ─── Shell ───────────────────────────────────────────────────────────────────

type PanelId = "dashboard" | "members" | "applications" | "bookings" | "content" | "settings" | "history";

function AdminPage({ username, onSignOut }: { username: string; onSignOut: () => void }) {
  const [panel, setPanel] = useState<PanelId>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fetch counts for nav badges
  const listRegs = useServerFn(adminListRegistrations);
  const listBookings = useServerFn(adminListBookings);
  const [pendingApps, setPendingApps] = useState<number | null>(null);
  const [pendingBookings, setPendingBookings] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      listRegs().catch(() => ({ rows: [] })),
      listBookings().catch(() => ({ rows: [] })),
    ]).then(([r, b]) => {
      if (cancelled) return;
      setPendingApps(r.rows.filter((x: any) => x.status === "pending").length);
      setPendingBookings(b.rows.filter((x: any) => x.status === "pending").length);
    });
    return () => { cancelled = true; };
  }, [listRegs, listBookings]);

  const NAV: { section: string; items: { id: PanelId; icon: string; label: string; badge?: number | null }[] }[] = [
    { section: "Overview", items: [{ id: "dashboard", icon: "📊", label: "Dashboard" }] },
    { section: "Community", items: [
      { id: "members", icon: "👥", label: "Members" },
      { id: "applications", icon: "📝", label: "Applications", badge: pendingApps },
    ]},
    { section: "Studios 25", items: [
      { id: "bookings", icon: "📅", label: "Bookings", badge: pendingBookings },
    ]},
    { section: "Workspace", items: [
      { id: "content", icon: "🎨", label: "Content" },
      { id: "settings", icon: "⚙️", label: "Settings" },
      { id: "history", icon: "📜", label: "History" },
    ]},
  ];

  const titles: Record<PanelId, { title: string; sub: string }> = {
    dashboard: { title: "Dashboard", sub: "Overview of TCL Babcock today" },
    members: { title: "Members", sub: "All approved TCL members" },
    applications: { title: "Applications", sub: "Review and approve new applicants" },
    bookings: { title: "Studio Bookings", sub: "Confirm Studios 25 reservations" },
    content: { title: "Content", sub: "Manage published stories and assets" },
    settings: { title: "Settings", sub: "Configure TCL workspace" },
    history: { title: "History", sub: "Audit log and admin actions" },
  };

  return (
    <div className="admin-body">
      <aside className={"sidebar" + (sidebarOpen ? " open" : "")}>
        <div className="sidebar-header">
          <Link to="/" className="sidebar-logo" style={{ textDecoration: "none" }}>
            <div className="logo-box-sm">TCL</div>
            <div className="logo-text">Babcock<span>Admin Console</span></div>
          </Link>
        </div>
        <div className="sidebar-admin">
          <div className="admin-avatar">AD</div>
          <div>
            <div className="admin-name">{username || "Admin"}</div>
            <div className="admin-role">TCL Babcock</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {NAV.map((g) => (
            <div key={g.section}>
              <div className="nav-section">{g.section}</div>
              {g.items.map((it) => (
                <button
                  key={it.id}
                  className={"nav-item" + (panel === it.id ? " active" : "")}
                  onClick={() => { setPanel(it.id); setSidebarOpen(false); }}
                >
                  <span className="nav-icon">{it.icon}</span>
                  <span>{it.label}</span>
                  {it.badge != null && it.badge > 0 ? <span className="nbadge">{it.badge}</span> : null}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="logout-btn" onClick={onSignOut}>Sign out</button>
          <Link to="/" className="logout-btn" style={{ marginTop: 8 }}>← Back to site</Link>
        </div>
      </aside>

      <div className="admin-main">
        <div className="topbar">
          <div className="topbar-left">
            <button className="hamburger-btn" onClick={() => setSidebarOpen((o) => !o)} aria-label="Menu">☰</button>
            <div>
              <div className="page-title">{titles[panel].title}</div>
              <div className="page-subtitle">{titles[panel].sub}</div>
            </div>
          </div>
          <div className="topbar-right">
            <button className="topbar-btn" onClick={() => setPanel("applications")}>Review apps</button>
            <button className="topbar-btn" onClick={() => setPanel("bookings")}>Manage bookings</button>
            <button className="topbar-btn primary" onClick={() => setPanel("settings")}>Workspace settings</button>
          </div>
        </div>

        <div className="content">
          {panel === "dashboard" && <DashboardPanel onSwitchPanel={setPanel} />}
          {panel === "members" && <MembersPanel />}
          {panel === "applications" && <ApplicationsPanel />}
          {panel === "bookings" && <BookingsPanel />}
          {panel === "content" && <ContentPanel />}
          {panel === "settings" && <SettingsPanel />}
          {panel === "history" && <HistoryPanel />}
        </div>
      </div>
    </div>
  );
}

// ─── Shared ───────────────────────────────────────────────────────────────────

function StatusBadge({ s }: { s: string }) {
  const map: Record<string, string> = {
    Active: "badge-success", approved: "badge-success", confirmed: "badge-success", Confirmed: "badge-success",
    New: "badge-info",
    Pending: "badge-warning", pending: "badge-warning", Reviewing: "badge-warning",
    Inactive: "badge-danger", declined: "badge-danger", Declined: "badge-danger",
  };
  const label = s.charAt(0).toUpperCase() + s.slice(1);
  return <span className={"badge " + (map[s] ?? "badge-info")}>{label}</span>;
}

function initials(name: string) {
  return (name || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

function DashboardPanel({ onSwitchPanel }: { onSwitchPanel: (panel: PanelId) => void }) {
  const listRegs = useServerFn(adminListRegistrations);
  const listBookings = useServerFn(adminListBookings);
  const [regRows, setRegRows] = useState<any[]>([]);
  const [bookingRows, setBookingRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiHealthy, setApiHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.allSettled([
      listRegs(),
      listBookings(),
    ]).then((results) => {
      if (cancelled) return;
      const regResult = results[0];
      const bookResult = results[1];
      const regs = regResult.status === "fulfilled" ? regResult.value.rows : [];
      const books = bookResult.status === "fulfilled" ? bookResult.value.rows : [];
      setRegRows(regs);
      setBookingRows(books);
      setApiHealthy(regResult.status === "fulfilled" && bookResult.status === "fulfilled");
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [listRegs, listBookings]);

  const pendingCount = regRows.filter((r: any) => r.status === "pending").length;
  const approvedCount = regRows.filter((r: any) => r.status === "approved").length;
  const declinedCount = regRows.filter((r: any) => r.status === "declined").length;
  const confirmedBookings = bookingRows.filter((b: any) => b.status === "confirmed").length;
  const pendingBookings = bookingRows.filter((b: any) => b.status === "pending").length;
  const declinedBookings = bookingRows.filter((b: any) => b.status === "declined").length;

  const packageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const b of bookingRows) {
      counts[b.package_name] = (counts[b.package_name] ?? 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [bookingRows]);

  // Recent activity — sort by raw ISO created_at, not locale string
  const recent = useMemo(() => {
    const regs = regRows.slice(0, 5).map((x: any) => ({
      kind: "reg" as const,
      text: `${x.full_name} applied to ${x.committee_name}`,
      iso: x.created_at,
    }));
    const books = bookingRows.slice(0, 5).map((x: any) => ({
      kind: "booking" as const,
      text: `${x.full_name} booked ${x.package_name} on ${x.booking_date}`,
      iso: x.created_at,
    }));
    return [...regs, ...books]
      .sort((a, b) => (a.iso < b.iso ? 1 : -1))
      .slice(0, 6);
  }, [regRows, bookingRows]);

  // Committee breakdown — derived from real data
  const committeeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of regRows) {
      counts[r.committee_name] = (counts[r.committee_name] ?? 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [regRows]);

  const maxCount = committeeCounts[0]?.[1] ?? 1;

  return (
    <>
      <div className="admin-actions-row">
        <button className="action-btn primary" onClick={() => onSwitchPanel("applications")}>Review pending applications</button>
        <button className="action-btn" onClick={() => onSwitchPanel("bookings")}>Confirm studio bookings</button>
        <button className="action-btn" onClick={() => onSwitchPanel("members")}>View approved members</button>
      </div>

      <div className="stats-grid">
        {[
          { label: "Total Applications", value: loading ? "…" : regRows.length.toLocaleString(), change: "All-time", icon: "📝" },
          { label: "Pending Review", value: loading ? "…" : pendingCount.toLocaleString(), change: "Needs action", icon: "⏳" },
          { label: "Approved Apps", value: loading ? "…" : approvedCount.toLocaleString(), change: "Member growth", icon: "✅" },
          { label: "Booking pipeline", value: loading ? "…" : `${confirmedBookings}/${bookingRows.length}`, change: apiHealthy === null ? "Checking" : apiHealthy ? "Backend healthy" : "API disconnected", icon: "📡" },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-change up">{s.change}</div>
          </div>
        ))}
      </div>

      <div className="two-col-admin">
        <div className="mini-card">
          <div className="mini-card-title">Recent Activity</div>
          {loading && <p className="panel-note">Loading…</p>}
          {!loading && recent.length === 0 && <p className="panel-note">No activity yet.</p>}
          {recent.map((a, i) => (
            <div key={i} className="activity-item">
              <span className={"activity-dot " + (a.kind === "reg" ? "green" : "blue")} />
              <div>
                <div className="activity-text">{a.text}</div>
                <div className="activity-time">{new Date(a.iso).toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mini-card">
          <div className="mini-card-title">Applications by Committee</div>
          {loading && <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>Loading…</p>}
          {!loading && committeeCounts.length === 0 && <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>No applications yet.</p>}
          {committeeCounts.map(([name, count]) => (
            <div key={name} className="comm-row">
              <span className="comm-name">{name}</span>
              <span className="comm-bar-wrap"><span className="comm-bar" style={{ width: `${Math.round((count / maxCount) * 100)}%` }} /></span>
              <span className="comm-count">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function HistoryPanel() {
  const listHistory = useServerFn(adminListHistory);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    listHistory()
      .then((res) => setRows(res.rows))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [listHistory]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="table-card">
      <div className="table-header">
        <div>
          <div className="table-title">Admin History</div>
          <div className="table-subtitle">Recent recorded admin actions and changes</div>
        </div>
        <div className="table-actions">
          <button className="action-btn" onClick={load}>Refresh</button>
        </div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr><th>When</th><th>Actor</th><th>Action</th><th>Entity</th><th>Details</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>Loading…</td></tr>}
            {!loading && rows.map((row: any) => (
              <tr key={row.id}>
                <td>{new Date(row.created_at).toLocaleString()}</td>
                <td>{row.actor}</td>
                <td>{row.action}</td>
                <td>{row.entity}{row.entity_id ? ` (${row.entity_id})` : ""}</td>
                <td style={{ maxWidth: 300, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{row.details ? JSON.stringify(row.details) : "—"}</td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>No history records yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Members ─────────────────────────────────────────────────────────────────

function MembersPanel() {
  const show = useToast();
  const listFn = useServerFn(adminListRegistrations);
  const updateFn = useServerFn(adminUpdateRegistrationStatus);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    listFn()
      .then((res) => setRows(res.rows))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [listFn]);

  useEffect(() => { load(); }, [load]);

  const members = useMemo(() =>
    rows
      .filter((r: any) => r.status === "approved")
      .filter((r: any) =>
        !q ||
        r.full_name.toLowerCase().includes(q.toLowerCase()) ||
        r.email.toLowerCase().includes(q.toLowerCase()) ||
        r.committee_name.toLowerCase().includes(q.toLowerCase()),
      ),
    [rows, q],
  );

  async function remove(id: string, name: string) {
    if (!window.confirm(`Remove ${name} from TCL? This sets their status to declined.`)) return;
    try {
      await updateFn({ data: { id, status: "declined" } });
      setRows((p) => p.map((r) => r.id === id ? { ...r, status: "declined" } : r));
      show("Member removed", "🗑️");
    } catch {
      show("Update failed", "⚠️");
    }
  }

  return (
    <div className="table-card">
      <div className="table-header">
        <div className="table-title">Approved Members ({loading ? "…" : members.length})</div>
        <div className="table-actions">
          <input className="search-input" placeholder="Search members…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="action-btn" onClick={load}>Refresh</button>
        </div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr><th>Member</th><th>Committee</th><th>Phone</th><th>Matric</th><th>Joined</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>Loading…</td></tr>}
            {!loading && members.map((m: any) => (
              <tr key={m.id}>
                <td>
                  <div className="member-cell">
                    <div className="member-avatar">{initials(m.full_name)}</div>
                    <div>
                      <div className="member-name">{m.full_name}</div>
                      <div className="member-email">{m.email}</div>
                    </div>
                  </div>
                </td>
                <td>{m.committee_name}</td>
                <td>{m.phone}</td>
                <td>{m.matric}</td>
                <td>{new Date(m.created_at).toLocaleDateString()}</td>
                <td>
                  <div className="row-actions">
                    <button className="row-btn del" onClick={() => remove(m.id, m.full_name)}>Remove</button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && members.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>No approved members yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Applications ─────────────────────────────────────────────────────────────

function ApplicationsPanel() {
  const show = useToast();
  const listFn = useServerFn(adminListRegistrations);
  const updateFn = useServerFn(adminUpdateRegistrationStatus);
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"pending" | "approved" | "declined">("pending");

  const load = useCallback(() => {
    setLoading(true);
    listFn()
      .then((res) => setApps(res.rows))
      .catch(() => setApps([]))
      .finally(() => setLoading(false));
  }, [listFn]);

  useEffect(() => { load(); }, [load]);

  const act = async (id: string, kind: "approve" | "decline") => {
    try {
      if (kind === "decline" && !window.confirm(`Decline this application?`)) return;
      const res = await updateFn({
        data: { id, status: kind === "approve" ? "approved" : "declined" },
      }) as any;
      // Move off the pending list
      setApps((p) => p.map((a) => a.id === id ? { ...a, status: kind === "approve" ? "approved" : "declined" } : a));
      if (kind === "approve") {
        if (res.emailSent) {
          show("Application approved — approval email sent ✉️", "✅");
        } else if (res.emailError) {
          show(`Approved (email not sent: ${res.emailError})`, "⚠️");
        } else {
          show("Application approved", "✅");
        }
      } else {
        show("Application declined", "❌");
      }
    } catch {
      show("Update failed", "⚠️");
    }
  };

  const counts = useMemo(() => ({
    pending: apps.filter((a: any) => a.status === "pending").length,
    approved: apps.filter((a: any) => a.status === "approved").length,
    declined: apps.filter((a: any) => a.status === "declined").length,
  }), [apps]);

  const visible = useMemo(() => apps
    .filter((a: any) => a.status === statusFilter)
    .filter((a: any) =>
      !q ||
      a.full_name.toLowerCase().includes(q.toLowerCase()) ||
      a.email.toLowerCase().includes(q.toLowerCase()) ||
      a.committee_name.toLowerCase().includes(q.toLowerCase())
    ),
  [apps, q, statusFilter]);

  return (
    <div className="table-card">
      <div className="table-header">
        <div>
          <div className="table-title">{statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Applications ({loading ? "…" : counts[statusFilter]})</div>
          <div className="status-pill-group">
            {(["pending", "approved", "declined"] as const).map((status) => (
              <button
                key={status}
                className={`action-btn${statusFilter === status ? " active" : ""}`}
                onClick={() => setStatusFilter(status)}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)} ({counts[status]})
              </button>
            ))}
          </div>
        </div>
        <div className="table-actions">
          <input className="search-input" placeholder="Search applicants…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="action-btn" onClick={load}>Refresh</button>
        </div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr><th>Applicant</th><th>Committee</th><th>Submitted</th><th>Contact</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>Loading…</td></tr>}
            {!loading && visible.map((a: any) => (
              <tr key={a.id}>
                <td>
                  <div className="member-cell">
                    <div className="member-avatar">{initials(a.full_name)}</div>
                    <div>
                      <div className="member-name">{a.full_name}</div>
                      <div className="member-email">{a.email}</div>
                    </div>
                  </div>
                </td>
                <td>{a.committee_name}</td>
                <td>{new Date(a.created_at).toLocaleString()}</td>
                <td>{a.phone}</td>
                <td><StatusBadge s={a.status} /></td>
                <td>
                  <div className="row-actions">
                    <button className="row-btn" onClick={() => act(a.id, "approve")}>Approve</button>
                    <button className="row-btn del" onClick={() => act(a.id, "decline")}>Decline</button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && visible.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>No applications match that filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Bookings ─────────────────────────────────────────────────────────────────

function BookingsPanel() {
  const show = useToast();
  const listFn = useServerFn(adminListBookings);
  const updateFn = useServerFn(adminUpdateBookingStatus);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "confirmed" | "declined">("all");

  const load = useCallback(() => {
    setLoading(true);
    listFn()
      .then((res) => setBookings(res.rows))
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  }, [listFn]);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => ({
    pending: bookings.filter((b: any) => b.status === "pending").length,
    confirmed: bookings.filter((b: any) => b.status === "confirmed").length,
    declined: bookings.filter((b: any) => b.status === "declined").length,
  }), [bookings]);

  const visibleBookings = useMemo(() => bookings
    .filter((b: any) => statusFilter === "all" ? true : b.status === statusFilter)
    .filter((b: any) =>
      !q ||
      b.full_name.toLowerCase().includes(q.toLowerCase()) ||
      b.package_name.toLowerCase().includes(q.toLowerCase()) ||
      b.phone.toLowerCase().includes(q.toLowerCase()) ||
      b.email.toLowerCase().includes(q.toLowerCase())
    ),
  [bookings, q, statusFilter]);

  const update = async (id: string, status: "confirmed" | "declined") => {
    try {
      if (status === "declined" && !window.confirm('Decline this booking?')) return;
      const res = await updateFn({ data: { id, status } }) as any;
      setBookings((p) => p.map((b) => b.id === id ? { ...b, status } : b));
      if (status === "confirmed") {
        show(res.emailSent ? "Booking confirmed — email sent ✉️" : `Confirmed (email not sent: ${res.emailError ?? "unknown"})`, res.emailSent ? "✅" : "⚠️");
      } else {
        show(res.emailSent ? "Booking declined — email sent ✉️" : `Declined (email not sent: ${res.emailError ?? "unknown"})`, res.emailSent ? "❌" : "⚠️");
      }
    } catch {
      show("Update failed", "⚠️");
    }
  };

  return (
    <div>
      <div className="table-card">
        <div className="table-header">
          <div>
            <div className="table-title">Studio Bookings</div>
            <div className="status-pill-group">
              {(["all", "pending", "confirmed", "declined"] as const).map((status) => (
                <button
                  key={status}
                  className={`action-btn${statusFilter === status ? " active" : ""}`}
                  onClick={() => setStatusFilter(status)}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}{status !== "all" ? ` (${counts[status]})` : ""}
                </button>
              ))}
            </div>
          </div>
          <div className="table-actions">
            <input className="search-input" placeholder="Search bookings…" value={q} onChange={(e) => setQ(e.target.value)} />
            <button className="action-btn" onClick={load}>Refresh</button>
          </div>
        </div>
      </div>
      {loading && <p style={{ color: "var(--muted)" }}>Loading bookings…</p>}
      {!loading && visibleBookings.length === 0 && <p style={{ color: "var(--muted)" }}>No bookings match that filter.</p>}
      {!loading && visibleBookings.length > 0 && (
        <div className="three-col">
          {visibleBookings.map((b: any) => (
            <div key={b.id} className="booking-detail">
              <div className="booking-top">
                <div>
                  <div className="booking-client">{b.full_name}</div>
                  <div className="booking-type">{b.project_type}</div>
                </div>
                <StatusBadge s={b.status} />
              </div>
              <div className="booking-meta">
                <div className="booking-meta-item">Package <span>{b.package_name}</span></div>
                <div className="booking-meta-item">Date <span>{b.booking_date}</span></div>
                <div className="booking-meta-item">Time <span>{b.time_slot}</span></div>
                <div className="booking-meta-item">Phone <span>{b.phone}</span></div>
                <div className="booking-meta-item">Email <span>{b.email}</span></div>
              </div>
              {b.status === "pending" ? (
                <div className="booking-actions">
                  <button className="bk-btn confirm" onClick={() => update(b.id, "confirmed")}>Confirm</button>
                  <a className="bk-btn msg" href={`https://wa.me/${b.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">Message</a>
                  <button className="bk-btn decline" onClick={() => update(b.id, "declined")}>Decline</button>
                </div>
              ) : (
                <div className="booking-actions">
                  <a className="bk-btn msg" href={`https://wa.me/${b.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">Message Client</a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Content ─────────────────────────────────────────────────────────────────

function ContentPanel() {
  const show = useToast();
  const fetchContent = useServerFn(getSiteContent);
  const upsertCommittee = useServerFn(adminUpsertCommittee) as any;
  const deleteCommittee = useServerFn(adminDeleteCommittee) as any;
  const upsertTeam = useServerFn(adminUpsertTeam) as any;
  const deleteTeam = useServerFn(adminDeleteTeam) as any;

  const [committees, setCommittees] = useState<any[] | null>(null);
  const [team, setTeam] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchContent()
      .then((res: any) => {
        if (!mounted) return;
        setCommittees(res?.committees ?? null);
        setTeam(res?.team ?? null);
      })
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [fetchContent]);

  // Committee form state
  const [editCommittee, setEditCommittee] = useState<any | null>(null);
  const [savingCommittee, setSavingCommittee] = useState(false);
  const [uploadingCommitteeImage, setUploadingCommitteeImage] = useState(false);

  // Team form state
  const [editMember, setEditMember] = useState<any | null>(null);
  const [savingMember, setSavingMember] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  async function uploadStorageFile(file: File, folder: string, id: string) {
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${folder}/${id}.${ext}`;
    const res = await supabase.storage.from('site-assets').upload(path, file, { upsert: true });
    if (res.error) throw res.error;
    const { data } = supabase.storage.from('site-assets').getPublicUrl(path);
    const publicUrl = (data as any)?.publicUrl || (data as any)?.public_url || '';
    if (!publicUrl) throw new Error('Could not generate image URL');
    return publicUrl;
  }

  async function handleSaveCommittee(e: React.FormEvent) {
    e.preventDefault();
    if (!editCommittee) return;
    setSavingCommittee(true);
    try {
      await upsertCommittee({ data: { committee: editCommittee } });
      // optimistic local update
      setCommittees((p) => {
        const arr = (p ?? []) as any[];
        const idx = arr.findIndex((x) => x.id === editCommittee.id);
        if (idx >= 0) { arr[idx] = editCommittee; return [...arr]; }
        return [editCommittee, ...arr];
      });
      setEditCommittee(null);
      show("Committee saved", "✅");
    } catch (err: any) {
      show(err?.message || "Save failed", "⚠️");
    } finally { setSavingCommittee(false); }
  }

  async function handleDeleteCommittee(id: string) {
    if (!window.confirm("Delete this committee? This cannot be undone.")) return;
    try {
      await deleteCommittee({ data: { id } });
      setCommittees((p) => (p ?? []).filter((c: any) => c.id !== id));
      show("Committee deleted", "🗑️");
    } catch {
      show("Delete failed", "⚠️");
    }
  }

  async function handleSaveMember(e: React.FormEvent) {
    e.preventDefault();
    if (!editMember) return;
    setSavingMember(true);
    try {
      await upsertTeam({ data: { member: editMember } });
      setTeam((p) => {
        const arr = (p ?? []) as any[];
        const idx = arr.findIndex((x) => x.id === editMember.id);
        if (idx >= 0) { arr[idx] = { ...arr[idx], ...editMember }; return [...arr]; }
        return [{ ...editMember }, ...arr];
      });
      setEditMember(null);
      show("Team member saved", "✅");
    } catch (err: any) {
      show(err?.message || "Save failed", "⚠️");
    } finally { setSavingMember(false); }
  }

  async function handleDeleteMember(id: string) {
    if (!window.confirm("Delete this team member?")) return;
    try {
      await deleteTeam({ data: { id } });
      setTeam((p) => (p ?? []).filter((m: any) => m.id !== id));
      show("Member deleted", "🗑️");
    } catch {
      show("Delete failed", "⚠️");
    }
  }

  const refreshContent = async () => {
    const res = await fetchContent();
    setCommittees(res.committees ?? null);
    setTeam(res.team ?? null);
  };

  return (
    <div className="content-panel">
      <div className="content-panel-header">
        <div>
          <div className="table-title">Site Content</div>
          <div className="panel-note">Organize committees, leadership team, and asset previews in one place.</div>
        </div>
        <button className="action-btn" onClick={refreshContent}>Refresh</button>
      </div>

      <div className="content-summary">
        <div className="content-card">
          <div className="content-card-title">Committees</div>
          <div className="content-card-desc">{loading ? "Loading…" : `Manage ${committees?.length ?? 0} committee groups.`}</div>
        </div>
        <div className="content-card">
          <div className="content-card-title">Leadership Team</div>
          <div className="content-card-desc">{loading ? "Loading…" : `Manage ${team?.length ?? 0} team profiles.`}</div>
        </div>
        <div className="content-card">
          <div className="content-card-title">Asset workflow</div>
          <div className="content-card-desc">Upload images and keep member and committee visuals updated from Supabase storage.</div>
        </div>
      </div>

      <div className="content-grid-two">
        <div className="content-card">
          <div className="content-panel-header" style={{ padding: 0, marginBottom: 12 }}>
            <div>
              <div className="content-card-title">Committees</div>
              <div className="content-card-desc">Create or edit the groups shown on the landing page.</div>
            </div>
            <button className="action-btn" onClick={() => setEditCommittee({ id: crypto.randomUUID(), name: "", desc: "", tagline: "", icon: "", image: "" })}>+ New</button>
          </div>

          {loading && <p style={{ color: "var(--muted)" }}>Loading committees…</p>}
          {!loading && (!committees || committees.length === 0) && <p style={{ color: "var(--muted)" }}>No committees found.</p>}

          {!loading && committees && (
            <div className="content-list">
              {committees.map((c: any) => (
                <div key={c.id} className="content-item">
                  <div className="content-item-title">
                    <div className="content-item-avatar">
                      <img src={c.image || placeholderImg} alt={c.name} />
                    </div>
                    <div>
                      <h4>{c.name}</h4>
                      <div className="content-item-meta">{c.tagline ?? c.desc}</div>
                    </div>
                  </div>
                  <div className="row-actions">
                    <button className="row-btn" onClick={() => setEditCommittee(c)}>Edit</button>
                    <button className="row-btn del" onClick={() => handleDeleteCommittee(c.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {editCommittee && (
            <form onSubmit={handleSaveCommittee} className="content-form">
              <input className="settings-input" placeholder="Name" value={editCommittee.name} onChange={(e) => setEditCommittee((p:any)=>({...p, name: e.target.value}))} />
              <input className="settings-input" placeholder="Tagline" value={editCommittee.tagline} onChange={(e) => setEditCommittee((p:any)=>({...p, tagline: e.target.value}))} />
              <input className="settings-input" placeholder="Icon (emoji or short text)" value={editCommittee.icon} onChange={(e) => setEditCommittee((p:any)=>({...p, icon: e.target.value}))} />
              <input className="settings-input" placeholder="Image URL" value={editCommittee.image} onChange={(e) => setEditCommittee((p:any)=>({...p, image: e.target.value}))} />

              <div className="upload-row">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setEditCommittee((p: any) => ({ ...p, __localPreview: URL.createObjectURL(f), __pendingFile: f }));
                  }}
                />
                <button
                  type="button"
                  className="action-btn"
                  onClick={async () => {
                    const file: File | undefined = (editCommittee as any)?.__pendingFile;
                    if (!file) return alert('Select a file first');
                    if (!confirm('Upload selected image to Supabase storage?')) return;
                    setUploadingCommitteeImage(true);
                    try {
                      const publicUrl = await uploadStorageFile(file, 'committees', editCommittee.id);
                      setEditCommittee((p: any) => ({ ...p, image: publicUrl }));
                      alert('Upload succeeded');
                    } catch (err: any) {
                      console.error(err);
                      alert('Upload failed: ' + (err?.message || String(err)));
                    } finally {
                      setUploadingCommitteeImage(false);
                      setEditCommittee((p: any) => { if (!p) return p; const copy = { ...p }; delete copy.__pendingFile; return copy; });
                    }
                  }}
                  disabled={uploadingCommitteeImage}
                >
                  {uploadingCommitteeImage ? 'Uploading…' : 'Upload image'}
                </button>
              </div>

              {(editCommittee.__localPreview || editCommittee.image) && (
                <div className="content-image-preview" style={{ width: 120, height: 120, borderRadius: 14, overflow: 'hidden', background: '#222' }}>
                  <img src={editCommittee.__localPreview || editCommittee.image} alt="preview" />
                </div>
              )}

              <div className="content-form-actions">
                <button className="action-btn primary" type="submit" disabled={savingCommittee}>{savingCommittee ? "Saving…" : "Save"}</button>
                <button className="action-btn" type="button" onClick={() => setEditCommittee(null)}>Cancel</button>
              </div>
            </form>
          )}
        </div>

        <div className="content-card">
          <div className="content-panel-header" style={{ padding: 0, marginBottom: 12 }}>
            <div>
              <div className="content-card-title">Leadership Team</div>
              <div className="content-card-desc">Add profiles for the team members shown on the site.</div>
            </div>
            <button className="action-btn" onClick={() => setEditMember({ id: crypto.randomUUID(), name: "", role: "", dept: "", image_url: "" })}>+ New</button>
          </div>

          {!loading && (!team || team.length === 0) && <p style={{ color: "var(--muted)" }}>No team members found.</p>}
          {!loading && team && (
            <div className="content-list">
              {team.map((m: any) => (
                <div key={m.id} className="content-item">
                  <div className="content-item-title">
                    <div className="content-item-avatar">
                      <img src={m.image_url || m.image || placeholderImg} alt={m.name} />
                    </div>
                    <div>
                      <h4>{m.name}</h4>
                      <div className="content-item-meta">{m.role} — {m.dept}</div>
                    </div>
                  </div>
                  <div className="row-actions">
                    <button className="row-btn" onClick={() => setEditMember(m)}>Edit</button>
                    <button className="row-btn del" onClick={() => handleDeleteMember(m.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {editMember && (
            <form onSubmit={handleSaveMember} className="content-form">
              <input className="settings-input" placeholder="Full name" value={editMember.name} onChange={(e)=>setEditMember((p:any)=>({...p, name: e.target.value}))} />
              <input className="settings-input" placeholder="Role" value={editMember.role} onChange={(e)=>setEditMember((p:any)=>({...p, role: e.target.value}))} />
              <input className="settings-input" placeholder="Department" value={editMember.dept} onChange={(e)=>setEditMember((p:any)=>({...p, dept: e.target.value}))} />
              <input className="settings-input" placeholder="Image URL" value={editMember.image_url} onChange={(e)=>setEditMember((p:any)=>({...p, image_url: e.target.value}))} />

              <div className="upload-row">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setEditMember((p: any) => ({ ...p, __localPreview: URL.createObjectURL(f), __pendingFile: f }));
                  }}
                />
                <button
                  type="button"
                  className="action-btn"
                  onClick={async () => {
                    const file: File | undefined = (editMember as any)?.__pendingFile;
                    if (!file) {
                      show('Select a file first.', '⚠️');
                      return;
                    }
                    setUploadingImage(true);
                    try {
                      const publicUrl = await uploadStorageFile(file, 'team', editMember.id || crypto.randomUUID());
                      setEditMember((p: any) => ({ ...p, image_url: publicUrl }));
                      show('Upload succeeded', '✅');
                    } catch (err: any) {
                      console.error(err);
                      show('Upload failed: ' + (err?.message || String(err)), '⚠️');
                    } finally {
                      setUploadingImage(false);
                      setEditMember((p: any) => { if (!p) return p; const copy = { ...p }; delete copy.__pendingFile; return copy; });
                    }
                  }}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? 'Uploading…' : 'Upload image'}
                </button>
              </div>

              {(editMember.__localPreview || editMember.image_url) && (
                <div className="content-image-preview" style={{ width: 120, height: 120, borderRadius: 14, overflow: 'hidden', background: '#222' }}>
                  <img src={editMember.__localPreview || editMember.image_url} alt="preview" />
                </div>
              )}

              <div className="content-form-actions">
                <button className="action-btn primary" type="submit" disabled={savingMember}>{savingMember ? "Saving…" : "Save"}</button>
                <button className="action-btn" type="button" onClick={() => setEditMember(null)}>Cancel</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Settings ─────────────────────────────────────────────────────────────────

function SettingsPanel() {
  const show = useToast();
  const fetchFn = useServerFn(getPublicSettings);
  const saveFn = useServerFn(adminUpdateSettings);
  const [s, setS] = useState<PublicSettings>(DEFAULT_PUBLIC_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [urlError, setUrlError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchFn()
      .then((res) => { if (!cancelled) setS(res); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [fetchFn]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (s.waGcLink && !/^https:\/\/.+/.test(s.waGcLink)) {
      setUrlError("Must start with https://");
      return;
    }
    setUrlError("");
    setSaving(true);
    try {
      await saveFn({ data: { ...s } });
      show("Settings saved", "✅");
    } catch (err: any) {
      show(err?.message || "Save failed", "⚠️");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p style={{ color: "var(--muted)" }}>Loading settings…</p>;

  return (
    <form onSubmit={save}>
      {!s.waGcLink && (
        <div style={{ background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.35)", borderRadius: 10, padding: "0.75rem 1rem", marginBottom: "1.25rem", color: "#b45309", fontSize: "0.875rem" }}>
          ⚠️ <strong>WhatsApp group link is not set.</strong> Approving applications will succeed but no approval email will be sent until this is configured below.
        </div>
      )}
      <div className="settings-section">
        <div className="settings-title">Studio pricing</div>
        <div className="settings-desc">Prices shown on the landing page and studio booking page (in ₦).</div>
        {([
          ["hourlyPriceNaira", "Hourly (1 hr)"],
          ["halfDayPriceNaira", "Half Day (4 hrs)"],
          ["fullDayPriceNaira", "Full Day (8 hrs)"],
          ["podcastPriceNaira", "Podcast (2 hrs)"],
        ] as const).map(([key, label]) => (
          <div className="settings-row" key={key}>
            <div><div className="settings-row-label">{label}</div></div>
            <input
              className="settings-input"
              type="number"
              min={0}
              value={s[key]}
              onChange={(e) => setS((p) => ({ ...p, [key]: Number(e.target.value) || 0 }))}
            />
          </div>
        ))}
      </div>

      <div className="settings-section">
        <div className="settings-title">Contact & integrations</div>

        <div className="settings-row">
          <div>
            <div className="settings-row-label">Admin WhatsApp number</div>
            <div className="settings-row-sub">International format, digits only — e.g. 2348012345678.</div>
          </div>
          <input
            className="settings-input"
            value={s.adminWhatsapp}
            onChange={(e) => setS((p) => ({ ...p, adminWhatsapp: e.target.value.replace(/\D/g, "") }))}
            placeholder="2348012345678"
          />
        </div>

        <div className="settings-row">
          <div>
            <div className="settings-row-label">WhatsApp community group link</div>
            <div className="settings-row-sub">
              Shown after registration and included in approval emails. Must start with https://.
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <input
              className="settings-input"
              value={s.waGcLink}
              onChange={(e) => { setS((p) => ({ ...p, waGcLink: e.target.value })); setUrlError(""); }}
              placeholder="https://chat.whatsapp.com/..."
            />
            {urlError && <span style={{ color: "#ef4444", fontSize: "0.8rem" }}>{urlError}</span>}
          </div>
        </div>

        <div className="settings-row">
          <div>
            <div className="settings-row-label">Google Analytics ID</div>
            <div className="settings-row-sub">GA4 Measurement ID (G-XXXXXXXXXX). Leave blank to disable.</div>
          </div>
          <input
            className="settings-input"
            value={s.gaMeasurementId}
            onChange={(e) => setS((p) => ({ ...p, gaMeasurementId: e.target.value }))}
            placeholder="G-XXXXXXXXXX"
          />
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
        <button type="submit" className="action-btn accent" disabled={saving}>
          {saving ? "Saving…" : "Save settings"}
        </button>
      </div>
    </form>
  );
}
