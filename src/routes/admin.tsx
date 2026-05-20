import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ToastProvider, useToast } from "@/lib/tcl-toast";
import {
  adminVerifyPassword,
  adminListRegistrations,
  adminListBookings,
  adminUpdateBookingStatus,
  adminUpdateRegistrationStatus,
  adminUpdateSettings,
} from "@/lib/tcl-admin.functions";
import { getPublicSettings, type PublicSettings } from "@/lib/tcl-backend.functions";
import { DEFAULT_PUBLIC_SETTINGS } from "@/lib/tcl-config";

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

const ADMIN_PWD_KEY = "tcl_admin_pwd_v1";

// ─── Gate ────────────────────────────────────────────────────────────────────

function AdminGate() {
  const verify = useServerFn(adminVerifyPassword);
  const [password, setPassword] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") { setChecking(false); return; }
    const saved = window.sessionStorage.getItem(ADMIN_PWD_KEY);
    if (!saved) { setChecking(false); return; }
    const { u, p } = JSON.parse(saved);
    verify({ data: { username: u, password: p } })
      .then((res) => { if (res.ok) { setUsername(u); setPassword(p); } else window.sessionStorage.removeItem(ADMIN_PWD_KEY); })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [verify]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await verify({ data: { username, password: input } });
    if (res.ok) {
      window.sessionStorage.setItem(ADMIN_PWD_KEY, JSON.stringify({ u: username, p: input }));
      setPassword(input);
    } else {
      setError("Incorrect username or password.");
    }
  }

  if (checking) {
    return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: "var(--muted)" }}>Loading…</div>;
  }

  if (!password) {
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

  return <AdminPage password={password} onSignOut={() => { window.sessionStorage.removeItem(ADMIN_PWD_KEY); setPassword(null); setUsername(""); }} />;
}

// ─── Shell ───────────────────────────────────────────────────────────────────

type PanelId = "dashboard" | "members" | "applications" | "bookings" | "content" | "settings";

function AdminPage({ password, onSignOut }: { password: string; onSignOut: () => void }) {
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
      listRegs({ data: { password } }).catch(() => ({ rows: [] })),
      listBookings({ data: { password } }).catch(() => ({ rows: [] })),
    ]).then(([r, b]) => {
      if (cancelled) return;
      setPendingApps(r.rows.filter((x: any) => x.status === "pending").length);
      setPendingBookings(b.rows.filter((x: any) => x.status === "pending").length);
    });
    return () => { cancelled = true; };
  }, [listRegs, listBookings, password]);

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
    ]},
  ];

  const titles: Record<PanelId, { title: string; sub: string }> = {
    dashboard: { title: "Dashboard", sub: "Overview of TCL Babcock today" },
    members: { title: "Members", sub: "All approved TCL members" },
    applications: { title: "Applications", sub: "Review and approve new applicants" },
    bookings: { title: "Studio Bookings", sub: "Confirm Studios 25 reservations" },
    content: { title: "Content", sub: "Manage published stories and assets" },
    settings: { title: "Settings", sub: "Configure TCL workspace" },
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
            <div className="admin-name">Admin</div>
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
        </div>

        <div className="content">
          {panel === "dashboard" && <DashboardPanel password={password} />}
          {panel === "members" && <MembersPanel password={password} />}
          {panel === "applications" && <ApplicationsPanel password={password} />}
          {panel === "bookings" && <BookingsPanel password={password} />}
          {panel === "content" && <ContentPanel />}
          {panel === "settings" && <SettingsPanel password={password} />}
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

function DashboardPanel({ password }: { password: string }) {
  const listRegs = useServerFn(adminListRegistrations);
  const listBookings = useServerFn(adminListBookings);
  const [regRows, setRegRows] = useState<any[]>([]);
  const [bookingRows, setBookingRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      listRegs({ data: { password } }).catch(() => ({ rows: [] })),
      listBookings({ data: { password } }).catch(() => ({ rows: [] })),
    ]).then(([r, b]) => {
      if (cancelled) return;
      setRegRows(r.rows);
      setBookingRows(b.rows);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [listRegs, listBookings, password]);

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
      <div className="stats-grid">
        {[
          { label: "Total Applications", value: loading ? "…" : regRows.length.toLocaleString(), change: "All-time", icon: "📝" },
          { label: "Pending Review", value: loading ? "…" : regRows.filter((r: any) => r.status === "pending").length.toLocaleString(), change: "Awaiting action", icon: "⏳" },
          { label: "Studio Bookings", value: loading ? "…" : bookingRows.length.toLocaleString(), change: "All-time", icon: "📅" },
          { label: "Status", value: "Live", change: "Backend connected", icon: "✅" },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-change up">↑ {s.change}</div>
          </div>
        ))}
      </div>

      <div className="two-col-admin">
        <div className="mini-card">
          <div className="mini-card-title">Recent Activity</div>
          {loading && <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>Loading…</p>}
          {!loading && recent.length === 0 && <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>No activity yet.</p>}
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

// ─── Members ─────────────────────────────────────────────────────────────────

function MembersPanel({ password }: { password: string }) {
  const show = useToast();
  const listFn = useServerFn(adminListRegistrations);
  const updateFn = useServerFn(adminUpdateRegistrationStatus);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    listFn({ data: { password } })
      .then((res) => setRows(res.rows))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [listFn, password]);

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
      await updateFn({ data: { password, id, status: "declined" } });
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

function ApplicationsPanel({ password }: { password: string }) {
  const show = useToast();
  const listFn = useServerFn(adminListRegistrations);
  const updateFn = useServerFn(adminUpdateRegistrationStatus);
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    listFn({ data: { password } })
      .then((res) => setApps(res.rows))
      .catch(() => setApps([]))
      .finally(() => setLoading(false));
  }, [listFn, password]);

  useEffect(() => { load(); }, [load]);

  const act = async (id: string, kind: "approve" | "decline") => {
    try {
      const res = await updateFn({
        data: { password, id, status: kind === "approve" ? "approved" : "declined" },
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

  const visible = apps.filter((a: any) => a.status === "pending");

  return (
    <div className="table-card">
      <div className="table-header">
        <div className="table-title">Pending Applications ({loading ? "…" : visible.length})</div>
        <div className="table-actions">
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
              <tr><td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>No pending applications 🎉</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Bookings ─────────────────────────────────────────────────────────────────

function BookingsPanel({ password }: { password: string }) {
  const show = useToast();
  const listFn = useServerFn(adminListBookings);
  const updateFn = useServerFn(adminUpdateBookingStatus);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    listFn({ data: { password } })
      .then((res) => setBookings(res.rows))
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  }, [listFn, password]);

  useEffect(() => { load(); }, [load]);

  const update = async (id: string, status: "confirmed" | "declined") => {
    try {
      const res = await updateFn({ data: { password, id, status } }) as any;
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
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
        <button className="action-btn" onClick={load}>Refresh</button>
      </div>
      {loading && <p style={{ color: "var(--muted)" }}>Loading bookings…</p>}
      {!loading && bookings.length === 0 && <p style={{ color: "var(--muted)" }}>No bookings yet.</p>}
      {!loading && (
        <div className="three-col">
          {bookings.map((b: any) => (
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
  return (
    <div className="table-card">
      <div className="table-header">
        <div className="table-title">Content Library</div>
        <div className="table-actions">
          <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Coming soon</span>
        </div>
      </div>
      <div style={{ padding: "3rem", textAlign: "center", color: "var(--muted)" }}>
        <p style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🎨</p>
        <p style={{ fontSize: "1rem", fontWeight: 600, color: "var(--white)" }}>Content management coming soon</p>
        <p style={{ fontSize: "0.9rem" }}>Publish articles, reels and newsletters directly from here.</p>
      </div>
    </div>
  );
}

// ─── Settings ─────────────────────────────────────────────────────────────────

function SettingsPanel({ password }: { password: string }) {
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
      await saveFn({ data: { password, ...s } });
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
