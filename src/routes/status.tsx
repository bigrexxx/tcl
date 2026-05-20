import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { checkApplicationStatus } from "@/lib/tcl-admin.functions";
import { TclNav, TclFooter } from "@/components/TclNav";


export const Route = createFileRoute("/status")({
  head: () => ({
    meta: [
      { title: "Check Application Status — TCL Babcock" },
      {
        name: "description",
        content: "Check the status of your TCL Babcock membership application.",
      },
    ],
  }),
  component: StatusPage,
});

type AppResult = {
  id: string;
  committeeName: string;
  status: "pending" | "approved" | "declined";
  submittedAt: string;
  fullName: string;
};

const STATUS_META: Record<
  AppResult["status"],
  { icon: string; label: string; color: string; bg: string; border: string; message: string }
> = {
  pending: {
    icon: "⏳",
    label: "Under Review",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.25)",
    message:
      "Your application is in the queue and will be reviewed by the TCL team. Check back soon — you'll also receive an email once a decision is made.",
  },
  approved: {
    icon: "🎉",
    label: "Approved",
    color: "#4ade80",
    bg: "rgba(74,222,128,0.08)",
    border: "rgba(74,222,128,0.25)",
    message:
      "Congratulations! You've been accepted into TCL Babcock. Check your email for the WhatsApp community link and next steps.",
  },
  declined: {
    icon: "💜",
    label: "Not Accepted",
    color: "#a855f7",
    bg: "rgba(168,85,247,0.08)",
    border: "rgba(168,85,247,0.25)",
    message:
      "Thank you for applying. Unfortunately we couldn't move forward with your application this cycle. We encourage you to apply again in the next season — keep creating!",
  },
};

function StatusPage() {
  const checkFn = useServerFn(checkApplicationStatus);

  const [email, setEmail] = useState("");
  const [matric, setMatric] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<AppResult[] | null>(null);

  async function handleCheck(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResults(null);
    setLoading(true);
    try {
      const res = await checkFn({ data: { email: email.trim(), matric: matric.trim() } });
      if (!res.ok) {
        setError(res.error);
      } else {
        setResults(res.applications);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setResults(null);
    setError("");
  }

  return (
    <>
      <TclNav />
      <main
        style={{
          minHeight: "100vh",
          background: "var(--bg, #0b0b10)",
          padding: "6rem 1rem 4rem",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", maxWidth: 520, marginBottom: "2.5rem" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "rgba(168,85,247,0.12)",
              border: "1px solid rgba(168,85,247,0.25)",
              borderRadius: 99,
              padding: "0.35rem 1rem",
              fontSize: "0.8rem",
              color: "#a855f7",
              fontWeight: 600,
              letterSpacing: "0.5px",
              textTransform: "uppercase",
              marginBottom: "1rem",
            }}
          >
            Application Portal
          </div>
          <h1
            style={{
              fontSize: "clamp(1.75rem, 5vw, 2.5rem)",
              fontWeight: 800,
              color: "#fff",
              margin: "0 0 0.75rem",
              lineHeight: 1.15,
            }}
          >
            Check your{" "}
            <span
              style={{
                background: "linear-gradient(135deg,#7c3aed,#a855f7)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              application status
            </span>
          </h1>
          <p style={{ color: "#888", fontSize: "1rem", margin: 0, lineHeight: 1.6 }}>
            Enter the email address and matric number you used when applying to TCL Babcock.
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            width: "100%",
            maxWidth: 480,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 20,
            padding: "2rem",
          }}
        >
          {results === null ? (
            /* ── Lookup form ── */
            <form onSubmit={handleCheck}>
              <div style={{ marginBottom: "1.25rem" }}>
                <label style={labelStyle}>Email address</label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="yourname@babcock.edu.ng"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <label style={labelStyle}>Matric number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 22/2347"
                  value={matric}
                  onChange={(e) => setMatric(e.target.value)}
                  style={inputStyle}
                />
              </div>

              {error && (
                <div
                  style={{
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.25)",
                    borderRadius: 10,
                    padding: "0.75rem 1rem",
                    color: "#ef4444",
                    fontSize: "0.9rem",
                    marginBottom: "1.25rem",
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{ width: "100%", opacity: loading ? 0.7 : 1 }}
              >
                {loading ? "Checking…" : "Check Status"}
              </button>
            </form>
          ) : (
            /* ── Results ── */
            <div>
              <div style={{ marginBottom: "1.5rem" }}>
                <div style={{ color: "#888", fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                  Results for
                </div>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: "1.05rem" }}>
                  {results[0].fullName}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
                {results.map((app) => {
                  const meta = STATUS_META[app.status];
                  return (
                    <div
                      key={app.id}
                      style={{
                        background: meta.bg,
                        border: `1px solid ${meta.border}`,
                        borderRadius: 14,
                        padding: "1.25rem",
                      }}
                    >
                      {/* Committee + status badge */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: "0.5rem",
                          marginBottom: "0.75rem",
                          flexWrap: "wrap",
                        }}
                      >
                        <div>
                          <div
                            style={{ color: "#aaa", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "0.2rem" }}
                          >
                            Committee
                          </div>
                          <div style={{ color: "#fff", fontWeight: 700, fontSize: "1rem" }}>
                            {app.committeeName}
                          </div>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.4rem",
                            background: "rgba(0,0,0,0.25)",
                            border: `1px solid ${meta.border}`,
                            borderRadius: 99,
                            padding: "0.3rem 0.75rem",
                            fontSize: "0.8rem",
                            fontWeight: 700,
                            color: meta.color,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {meta.icon} {meta.label}
                        </div>
                      </div>

                      {/* Message */}
                      <p style={{ margin: "0 0 0.75rem", fontSize: "0.88rem", color: "#b0b0c0", lineHeight: 1.6 }}>
                        {meta.message}
                      </p>

                      {/* Submitted date */}
                      <div style={{ fontSize: "0.78rem", color: "#555" }}>
                        Submitted {new Date(app.submittedAt).toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={reset}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "transparent",
                  color: "#888",
                  fontSize: "0.9rem",
                  cursor: "pointer",
                }}
              >
                ← Check a different application
              </button>
            </div>
          )}
        </div>

        {/* Helper links */}
        <div style={{ marginTop: "2rem", textAlign: "center", fontSize: "0.88rem", color: "#555" }}>
          Haven't applied yet?{" "}
          <Link to="/register" style={{ color: "#a855f7", fontWeight: 600, textDecoration: "none" }}>
            Apply to join TCL →
          </Link>
        </div>
      </main>
      <TclFooter />
    </>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.85rem",
  color: "#aaa",
  fontWeight: 600,
  marginBottom: "0.4rem",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.75rem 1rem",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(0,0,0,0.3)",
  color: "#fff",
  fontSize: "0.95rem",
  boxSizing: "border-box",
  outline: "none",
};
