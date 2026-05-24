import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

const SECTIONS = [
  { id: "about", label: "About" },
  { id: "committees", label: "Committees" },
  { id: "team", label: "Team" },
  { id: "studio", label: "Studios" },
];

export function TclNav({ variant = "main" }: { variant?: "main" | "back" }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string>("");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (variant !== "main") return;
    if (typeof window === "undefined") return;
    if (window.location.pathname !== "/") return;

    const els = SECTIONS
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => !!el);
    if (els.length === 0) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [variant]);

  function handleAnchor(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
    if (typeof window === "undefined") return;
    if (window.location.pathname !== "/") return;
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    setOpen(false);
    setActive(id);
    const top = el.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: "smooth" });
    history.replaceState(null, "", `/#${id}`);
  }

  return (
    <>
      <nav className={"tnav" + (scrolled ? " scrolled" : "")}>
        <Link to="/" className="nav-logo">
          <div className="nav-logo-box">TCL</div>
          <div className="nav-logo-text">Babcock<span>The Campus Lifestyle</span></div>
        </Link>
        {variant === "main" ? (
          <>
            <ul className="nav-links">
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a
                    href={`/#${s.id}`}
                    onClick={(e) => handleAnchor(e, s.id)}
                    className={active === s.id ? "active" : ""}
                    aria-current={active === s.id ? "true" : undefined}
                  >{s.label}</a>
                </li>
              ))}
              <li><Link to="/register">Join</Link></li>
              <li><Link to="/status">My Application</Link></li>
            </ul>
            <Link to="/register" className="nav-cta">Join Now</Link>
          </>
        ) : (
          <Link to="/" className="nav-back">← Back to main site</Link>
        )}
        <button className="hamburger" onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open} aria-controls="mobile-menu">
          <span></span><span></span><span></span>
        </button>
      </nav>
      {variant === "main" && (
        <div className={"mobile-menu" + (open ? " open" : "")} onClick={() => setOpen(false)}>
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`/#${s.id}`}
              onClick={(e) => handleAnchor(e, s.id)}
              className={active === s.id ? "active" : ""}
            >{s.label}</a>
          ))}
          <Link to="/register">Join Now</Link>
        </div>
      )}
    </>
  );
}

export function TclFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div className="footer-brand">
          <div className="footer-logo-box">TCL</div>
          <p>The Campus Lifestyle — Babcock University's creative community dedicated to connecting, learning, and inspiring the next generation of student changemakers.</p>
        </div>
        <div className="footer-col">
          <h4>Navigation</h4>
          <ul>
            <li><a href="/#about">About TCL</a></li>
            <li><a href="/#committees">Committees</a></li>
            <li><a href="/#team">Meet the Team</a></li>
            <li><a href="/#studio">Studios 25</a></li>
            <li><Link to="/register">Join Community</Link></li>
            <li><Link to="/status">Check Application Status</Link></li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>Studios 25</h4>
          <ul>
            <li><Link to="/studio">Book a Session</Link></li>
            <li><Link to="/studio">View Pricing</Link></li>
            <li><Link to="/studio">Check Availability</Link></li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>Follow TCL</h4>
          <ul>
            <li><a href="https://instagram.com/tclbabcock" target="_blank" rel="noreferrer">Instagram</a></li>
            <li><a href="https://twitter.com/tclbabcock" target="_blank" rel="noreferrer">Twitter / X</a></li>
            <li><a href="https://tiktok.com/@tclbabcock" target="_blank" rel="noreferrer">TikTok</a></li>
            <li><a href="mailto:hello@thecampuslifestyle.com">Email Us</a></li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2025 The Campus Lifestyle — Babcock University. All rights reserved.</span>
        <span>Connect · Learn · Inspire</span>
      </div>
    </footer>
  );
}
