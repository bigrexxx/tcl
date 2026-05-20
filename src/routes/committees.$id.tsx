import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { TclNav, TclFooter } from "@/components/TclNav";
import { ToastProvider, useReveal } from "@/lib/tcl-toast";
import { COMMITTEES } from "@/lib/tcl-committees";

export const Route = createFileRoute("/committees/$id")({
  head: ({ params }) => {
    const c = COMMITTEES.find((x) => x.id === params.id);
    const title = c ? `${c.name} — TCL Babcock` : "Committee — TCL Babcock";
    const desc = c?.desc ?? "TCL Babcock committee";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
      ],
    };
  },
  loader: ({ params }) => {
    const committee = COMMITTEES.find((c) => c.id === params.id);
    if (!committee) throw notFound();
    return { committee };
  },
  component: () => (
    <ToastProvider>
      <CommitteeDetail />
    </ToastProvider>
  ),
  notFoundComponent: () => (
    <div style={{ padding: "6rem 1rem", textAlign: "center" }}>
      <h1>Committee not found</h1>
      <Link to="/" className="btn-primary">Back home</Link>
    </div>
  ),
});

function CommitteeDetail() {
  useReveal();
  const { committee } = Route.useLoaderData() as { committee: (typeof COMMITTEES)[number] };
  return (
    <>
      <TclNav variant="back" />
      <section className="studio-hero">
        <div className="hero-shapes"><div className="shape s1" /><div className="shape s2" /></div>
        <div className="container">
          <div className="hero-logo-badge">
            <span className="tcl-box">TCL</span>
            <span className="studio-label">{committee.name.toUpperCase()}</span>
          </div>
          <h1>{committee.icon} {committee.name}<br /><span>{committee.tagline}.</span></h1>
          <p>{committee.desc}</p>
          <div className="hero-btns" style={{ marginTop: "1.5rem" }}>
            <Link to="/register" className="btn-primary">Apply to this Committee →</Link>
            <Link to="/" className="btn-secondary">All committees</Link>
          </div>
        </div>
      </section>

      <section className="showcase-section">
        <div className="container">
          <div className="centered reveal" style={{ marginBottom: "2rem" }}>
            <p className="eyebrow">What we do</p>
            <h2 className="sec-title">Inside the {committee.name}.</h2>
          </div>
          <div className="showcase-grid">
            {committee.highlights.map((h: string) => (
              <div key={h} className="showcase-item reveal">
                <div className="showcase-icon">✦</div>
                <h3>{h}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="booking-section">
        <div className="container">
          <div className="booking-layout">
            <div className="booking-info reveal">
              <p className="eyebrow">Director</p>
              <h2>{committee.director.name}</h2>
              <p><strong>{committee.director.role}</strong></p>
              <p>{committee.director.bio}</p>
            </div>
            <div className="form-card reveal">
              <h3 className="form-title">Ready to join?</h3>
              <p className="form-sub">Apply directly to {committee.name}. Takes 3–5 minutes.</p>
              <Link to="/register" className="btn-submit" style={{ display: "block", textAlign: "center", textDecoration: "none" }}>
                Apply Now →
              </Link>
              <p className="form-note">You'll be asked to pick a committee first — {committee.name} will be pre-selectable.</p>
            </div>
          </div>
        </div>
      </section>

      <TclFooter />
    </>
  );
}