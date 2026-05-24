import { createFileRoute, Link } from "@tanstack/react-router";
import React, { useEffect, useMemo, useState } from "react";
import { TclNav, TclFooter } from "@/components/TclNav";
import { ToastProvider, useReveal } from "@/lib/tcl-toast";
import { ScrollProgress, BackToTop, CountUp } from "@/components/LandingEnhancements";
import { useSettings, formatNaira } from "@/lib/tcl-config";
import { COMMITTEES } from "@/lib/tcl-committees";
import { DEFAULT_LEADERSHIP_TEAM } from "@/lib/tcl-defaults";
import { useServerFn } from "@tanstack/react-start";
import { getSiteContent } from "@/lib/tcl-content.functions";
import placeholderImg from "@/assets/tcl-og.jpg";

const FALLBACK_IMAGE = placeholderImg;

function FallbackImage({ src, fallback = FALLBACK_IMAGE, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { fallback?: string }) {
  const [currentSrc, setCurrentSrc] = useState(src || fallback);
  useEffect(() => {
    setCurrentSrc(src || fallback);
  }, [src, fallback]);

  return (
    <img
      {...props}
      src={currentSrc}
      alt={alt}
      onError={() => {
        if (currentSrc !== fallback) {
          setCurrentSrc(fallback);
        }
      }}
    />
  );
}

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "TCL Babcock — The Campus Lifestyle" },
    { name: "description", content: "Babcock University's premier creative community for student innovators, content creators, and future-ready changemakers." },
    { property: "og:title", content: "TCL Babcock — The Campus Lifestyle" },
    { property: "og:description", content: "Connect · Learn · Inspire — Join TCL Babcock." },
  ]}),
  component: () => <ToastProvider><Index/></ToastProvider>,
});

const team = [
  { image: "", name: "Founder", role: "Founder & Visionary", dept: "The Campus Lifestyle" },
  { image: "", name: "Campus Coordinator", role: "Campus Coordinator", dept: "Babcock University" },
  { image: "", name: "Operations Coordinator", role: "Operations", dept: "Babcock University" },
  { image: "", name: "HR Director", role: "Human Resources Director", dept: "People & Culture" },
  { image: "", name: "PRO", role: "Public Relations Officer", dept: "Communications" },
  { image: "", name: "General Secretary", role: "General Secretary", dept: "Administration" },
];

function Index() {
  useReveal();
  const settings = useSettings();
  const getContent = useServerFn(getSiteContent);
  const [committeesState, setCommitteesState] = useState(COMMITTEES as any[]);
  const [teamState, setTeamState] = useState(DEFAULT_LEADERSHIP_TEAM as any[]);

  useEffect(() => {
    let mounted = true;
    getContent()
      .then((res: any) => {
        if (!mounted || !res) return;
        if (res.committees && res.committees.length) setCommitteesState(res.committees);
        if (res.team && res.team.length) {
          setTeamState(res.team.map((m: any) => ({ image: m.image_url ?? "", name: m.name, role: m.role, dept: m.dept })));
        }
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, [getContent]);
  return (
    <>
      <ScrollProgress />
      <TclNav />
      <section className="hero" id="home">
        <div className="hero-shapes"><div className="shape s1"/><div className="shape s2"/><div className="shape s3"/></div>
        <div className="hero-glow" aria-hidden="true" />
        <div className="hero-badge"><span className="live-dot"/>Now Accepting Members — Babcock University</div>
        <div className="hero-logo-big">TCL</div>
        <h1>The Campus Lifestyle</h1>
        <p className="hero-tagline">Connect <span>|</span> Learn <span>|</span> Inspire</p>
        <p className="hero-desc">Babcock University's premier creative community for student innovators, content creators, and future-ready changemakers.</p>
        <div className="hero-media reveal">
          <FallbackImage
            src={FALLBACK_IMAGE}
            alt="Students collaborating on a creative project"
          />
        </div>
        <div className="hero-btns">
          <Link to="/register" className="btn-primary">Join the Community</Link>
          <Link to="/studio" className="btn-secondary">Book Studios 25</Link>
        </div>
        <div className="hero-cta-grid">
          <div className="hero-cta-card">
            <strong>Apply in 2 minutes</strong>
            <p>Choose a committee, fill your details, and become part of TCL Babcock today.</p>
          </div>
          <div className="hero-cta-card">
            <strong>Access student studios</strong>
            <p>Book Studios 25 for content, shoots, and creative projects as a member or guest.</p>
          </div>
        </div>
        <div className="hero-stats">
          <div className="stat-item"><div className="stat-num"><CountUp to="1000+" /></div><div className="stat-label">Members</div></div>
          <div className="stat-item"><div className="stat-num"><CountUp to="10+" /></div><div className="stat-label">Major Events</div></div>
          <div className="stat-item"><div className="stat-num"><CountUp to="10+" /></div><div className="stat-label">Partnerships</div></div>
          <div className="stat-item"><div className="stat-num"><CountUp to="1" /> <span className="stat-suffix">Year</span></div><div className="stat-label">Of Impact</div></div>
        </div>
      </section>

      <section id="about" className="about-section">
        <div className="container">
          <div className="two-col">
            <div className="reveal">
              <p className="eyebrow">Who We Are</p>
              <h2 className="sec-title">Built at Babcock.<br/>Built for Babcock.</h2>
              <p className="sec-desc">TCL is a dynamic creative community rooted in Babcock University — connecting, learning, and inspiring students through real-world skill-building, content creation, and global networking.</p>
              <Link to="/register" className="btn-primary">Become a Member</Link>
            </div>
            <div className="about-cards reveal">
              <div className="acard"><div className="acard-icon">🎯</div><h3>Our Mission</h3><p>Empowering Babcock students with meaningful connections, lifelong learning, and shared inspiration — committed to excellence, innovation, and integrity.</p></div>
              <div className="acard"><div className="acard-icon">🌍</div><h3>Our Vision</h3><p>A world where Babcock students seamlessly connect, continuously learn, and mutually inspire — driving collective growth and innovation that echoes far beyond campus walls.</p></div>
              <div className="acard"><div className="acard-icon">🤝</div><h3>Our Partners</h3><p>WHO, Emzor Nigeria, 100K Club, FAMSA, and BIMUN — a growing network of organisations invested in Babcock student success.</p></div>
            </div>
          </div>
        </div>
      </section>

      <section id="benefits" className="bg-deep">
        <div className="container">
          <div className="centered reveal">
            <p className="eyebrow center">Why Join TCL Babcock</p>
            <h2 className="sec-title">Everything you need to grow on campus</h2>
          </div>
          <div className="grid-3">
            {[["💬","WhatsApp Community","Instant access to the TCL Babcock WhatsApp group — connect, share opportunities, and stay updated in real time."],
              ["🎓","TCL Academy","Webinars, workshops and expert sessions that bridge classroom knowledge with industry-ready skills."],
              ["📸","TCL Studios 25","A professional photo and video shoot studio available to members and the public."],
              ["🏆","TCL Awards","Annual awards celebrating and documenting student achievements — giving Babcock innovators recognition."],
              ["🎬","Digital Portfolio","Event coverage, storytelling and interviews that build your online presence."],
              ["🌐","Global Network","Connect across 5 Nigerian universities and beyond — a growing alumni and peer network."]
            ].map(([i,t,d], idx) => (
              <div key={t} className="bcard reveal" style={{ transitionDelay: `${idx * 70}ms` }}><div className="bcard-icon">{i}</div><h3>{t}</h3><p>{d}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section id="committees" className="comm-section">
        <div className="container">
          <div className="centered reveal">
            <p className="eyebrow center">Our Structure</p>
            <h2 className="sec-title">TCL Babcock Committees</h2>
            <p className="sec-desc" style={{margin:"0 auto 2.5rem"}}>TCL Babcock runs through 10 specialist committees — each led by a passionate director and driven by members.</p>
          </div>
          <div className="comm-grid">
            {committeesState.map((c, idx) => (
              <Link key={c.id ?? idx} to="/committees/$id" params={{ id: c.id ?? c.name }} className="comm-card reveal" style={{ transitionDelay: `${idx * 50}ms` }} aria-label={`Open ${c.name} details`}>
                <div className="comm-card-media">
                  <FallbackImage
                    src={c.image || FALLBACK_IMAGE}
                    alt={`${c.name} image`}
                  />
                </div>
                <div className="comm-card-copy">
                  <div className="comm-icon">{c.icon}</div>
                  <h3>{c.name}</h3>
                  <p>{c.description ?? c.desc}</p>
                </div>
              </Link>
            ))}
          </div>
          <div className="structure-note reveal">
            <p>Each committee director reports to the <strong>Director for the Content Council</strong>, who reports to the <strong>Human Resources Director</strong>, through the <strong>Operations Coordinator</strong> and <strong>Campus Coordinator</strong> — all the way up to the <strong>Founder</strong>.</p>
          </div>
        </div>
      </section>

      <section id="team" className="team-section">
        <div className="container">
          <div className="centered reveal">
            <p className="eyebrow center">The People Behind TCL</p>
            <h2 className="sec-title">Meet the TCL Babcock Team</h2>
          </div>
          <p className="sub-label reveal">Leadership</p>
          <div className="leadership-grid reveal">
            {teamState.map((member, idx) => (
              <div key={`${member.name}-${idx}`} className="tcard" style={{ transitionDelay: `${idx * 60}ms` }}>
                <div className="team-avatar">
                  <FallbackImage src={member.image || FALLBACK_IMAGE} alt={`${member.role} portrait`} />
                </div>
                <h3>{member.name}</h3>
                <div className="role">{member.role}</div>
                <div className="dept">{member.dept}</div>
              </div>
            ))}
          </div>
          <p className="sub-label reveal">Committee Directors</p>
          <div className="dir-note reveal">
            <p>TCL Babcock is powered by <strong>10 Committee Directors</strong> — each leading their area with purpose and full accountability across all 10 committees, supported by dedicated members.</p>
            <div className="dir-badges">
              <div className="dbadge">10 Directors</div>
              <div className="dbadge">10 Committees</div>
              <div className="dbadge">Committee Members</div>
            </div>
          </div>
          <p className="join-note reveal">Want to join a committee? <Link to="/register">Register as a member</Link> and express your interest.</p>
        </div>
      </section>

      <section id="studio" className="studio-section">
        <div className="container">
          <div className="studio-layout">
            <div className="studio-visual reveal">
              <div className="studio-image">
                <FallbackImage
                  src={placeholderImg}
                  alt="Professional studio lighting and cameras"
                />
              </div>
              <div className="studio-visual-icon">📸</div>
              <h3>TCL Studios 25</h3>
              <p>Babcock's dedicated photo & video shoot studio — built for creators</p>
              <div className="stags">
                {["Portrait Photography","Brand Shoots","Reels & Videos","Course Photos","Event Coverage","Graduation Shoots"].map(t => <span key={t} className="stag">{t}</span>)}
              </div>
            </div>
            <div className="studio-info reveal">
              <p className="eyebrow">TCL Studios 25</p>
              <h2>Professional photo & video. Right on campus.</h2>
              <p>TCL Studios 25 is Babcock University's go-to photo and video shoot studio — fully equipped, available to members, students and the public.</p>
              <ul className="studio-perks">
                {["Professional studio lighting rigs","Seamless paper & fabric backdrops","Green screen for creative compositing","Multiple camera setups for stills & video","Props and styling accessories","Dedicated makeup & prep area","On-site creative direction support","Same-day edited previews available"].map(p => <li key={p}>{p}</li>)}
              </ul>
              <div className="price-row">
                <div className="pchip"><div className="price">{formatNaira(settings.hourlyPriceNaira)}</div><div className="pl">Per Hour</div></div>
                <div className="pchip"><div className="price">{formatNaira(settings.halfDayPriceNaira)}</div><div className="pl">Half Day</div></div>
                <div className="pchip"><div className="price">{formatNaira(settings.fullDayPriceNaira)}</div><div className="pl">Full Day</div></div>
              </div>
              <Link to="/studio" className="btn-primary">Book a Studio Session →</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="test-section">
        <div className="container">
          <div className="centered reveal">
            <p className="eyebrow center">Community Voices</p>
            <h2 className="sec-title">What Babcock students say</h2>
          </div>
          <div className="test-grid">
            {[
              ["TCL gave me the confidence to lead and create while still in school. It's the community every Babcock student needs.","— Taiwo Seyi, Graduate of Mass Communications"],
              ["This is a fantastic pull and we are thrilled to partner with TCL. The energy and creativity from these students is world-class.","— BIMUN"],
              ["TCL didn't just teach me how to create content — it showed me how to build a global network and monetise my creativity right here at Babcock.","— TCL Member, 300 Level"],
            ].map(([q,c]) => (
              <div key={c} className="test-card reveal">
                <blockquote>"{q}"</blockquote>
                <cite>{c}</cite>
              </div>
            ))}
          </div>
        </div>
      </section>

      <TclFooter />
      <BackToTop />
    </>
  );
}
