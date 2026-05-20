import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { TclNav, TclFooter } from "@/components/TclNav";
import { ToastProvider, useReveal, useToast } from "@/lib/tcl-toast";
import { useSettings, formatNaira } from "@/lib/tcl-config";
import { createBooking, listBookedSlots } from "@/lib/tcl-backend.functions";

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "Studios 25 — Book a Session | TCL Babcock" },
      { name: "description", content: "Book TCL Babcock's Studios 25 — photo, video and podcast production for Babcock creators. Hourly and half-day packages." },
      { property: "og:title", content: "Studios 25 — TCL Babcock" },
      { property: "og:description", content: "Premium creative production space for Babcock students. Book your session." },
    ],
  }),
  component: () => (
    <ToastProvider>
      <StudioPage />
    </ToastProvider>
  ),
});

type Pkg = { id: string; icon: string; name: string; price: string; duration: string; featured?: boolean; features: string[] };
function buildPackages(s: { hourlyPriceNaira: number; halfDayPriceNaira: number; fullDayPriceNaira: number; podcastPriceNaira: number }): Pkg[] {
  return [
    { id: "hour", icon: "📸", name: "Hourly", price: formatNaira(s.hourlyPriceNaira), duration: "1 hr", features: ["Studio access", "Basic lighting", "1 backdrop", "Use of props"] },
    { id: "half", icon: "🎬", name: "Half Day", price: formatNaira(s.halfDayPriceNaira), duration: "4 hrs", featured: true, features: ["Studio access", "Full lighting kit", "Multiple backdrops", "Props + makeup mirror", "1 free retouch"] },
    { id: "full", icon: "🎥", name: "Full Day", price: formatNaira(s.fullDayPriceNaira), duration: "8 hrs", features: ["All-day access", "Full lighting + grip", "All backdrops", "Assistant included", "3 free retouches"] },
    { id: "podcast", icon: "🎙️", name: "Podcast", price: formatNaira(s.podcastPriceNaira), duration: "2 hrs", features: ["Acoustic booth", "4 SM7B mics", "Multi-track recording", "Basic edit"] },
  ];
}

const ADDONS = [
  { name: "Extra hour", price: "₦5,000" },
  { name: "Pro photographer", price: "₦15,000" },
  { name: "Videographer", price: "₦20,000" },
  { name: "MUA on set", price: "₦12,000" },
  { name: "Same-day edit", price: "₦10,000" },
  { name: "Drone shot", price: "₦8,000" },
];

const SHOWCASE = [
  { icon: "💡", title: "Pro Lighting", desc: "Aputure, softboxes, ring lights and continuous LEDs ready to roll." },
  { icon: "🎨", title: "5 Backdrops", desc: "Seamless paper, cyclorama, brick, velvet and chroma green." },
  { icon: "🎧", title: "Audio Booth", desc: "Acoustically treated podcast room with broadcast-grade mics." },
  { icon: "🪑", title: "Lifestyle Set", desc: "Furnished corner for fashion, vlogs and product styling." },
];

const SLOTS = [
  "9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
  "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM",
  "5:00 PM", "6:00 PM", "7:00 PM", "8:00 PM",
];

function StudioPage() {
  useReveal();
  const show = useToast();
  const book = useServerFn(createBooking);
  const fetchSlots = useServerFn(listBookedSlots);
  const settings = useSettings();
  const PACKAGES = useMemo(() => buildPackages(settings), [settings]);
  const today = new Date().toISOString().slice(0, 10);

  const [date, setDate] = useState(today);
  const [slot, setSlot] = useState("");
  const [pkg, setPkg] = useState("half");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [project, setProject] = useState("");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const [booked, setBooked] = useState<Set<string>>(new Set());
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingSlots(true);
    fetchSlots({ data: { date } })
      .then((res) => { if (!cancelled && res.ok) setBooked(new Set(res.slots)); })
      .catch(() => { /* ignore */ })
      .finally(() => { if (!cancelled) setLoadingSlots(false); });
    return () => { cancelled = true; };
  }, [date, fetchSlots]);

  const chosen = useMemo(() => PACKAGES.find((p) => p.id === pkg), [pkg]);

  function validate(): string {
    if (!date) return "Please pick a date.";
    if (!slot) return "Please pick an available time slot.";
    if (!pkg) return "Please choose a package.";
    if (!name.trim()) return "Your name is required.";
    if (name.length > 100) return "Name must be under 100 characters.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Enter a valid email.";
    if (!/^[+\d][\d\s\-()]{6,20}$/.test(phone.trim())) return "Enter a valid phone number.";
    if (!project.trim()) return "Tell us what you're shooting.";
    if (project.length > 500 || notes.length > 1000) return "Please shorten your description.";
    return "";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = validate();
    if (v) { setErr(v); return; }
    setErr("");
    setSubmitting(true);
    try {
      const res = await book({
        data: {
          bookingDate: date,
          timeSlot: slot,
          packageId: pkg,
          packageName: chosen?.name ?? pkg,
          fullName: name,
          email,
          phone,
          projectType: project,
          notes,
        },
      });
      if (!res.ok) { setErr(res.error); setSubmitting(false); return; }
      if (typeof window !== "undefined") {
        (window as any).gtag?.("event", "studio_booking_submit", { package: pkg, date });
      }
      setBooked((prev) => new Set(prev).add(slot));
      setDone(true);
      show("Booking request sent!", "📅");
    } catch (e) {
      console.error(e);
      setErr("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function whatsappLink() {
    const lines = [
      "*Studios 25 — Booking Request*",
      `Package: ${chosen?.name} (${chosen?.price} / ${chosen?.duration})`,
      `Date: ${date}`,
      `Time: ${slot}`,
      "",
      "*Client*",
      `Name: ${name}`,
      `Email: ${email}`,
      `Phone: ${phone}`,
      "",
      `Project: ${project}`,
      notes ? `Notes: ${notes}` : "",
    ].filter(Boolean).join("\n");
    const wa = settings.adminWhatsapp;
    return wa ? `https://wa.me/${wa}?text=${encodeURIComponent(lines)}` : "";
  }

  return (
    <>
      <TclNav variant="back" />

      <section className="studio-hero">
        <div className="hero-shapes"><div className="shape s1" /><div className="shape s2" /></div>
        <div className="container">
          <div className="hero-logo-badge">
            <span className="tcl-box">TCL</span>
            <span className="studio-label">STUDIOS 25</span>
          </div>
          <h1>Where Babcock<br /><span>creators come to shoot.</span></h1>
          <p>A fully-equipped photo, video and podcast studio built for TCL members and the wider Babcock creative scene. Book by the hour or the day.</p>
          <div className="hero-tags">
            <span className="htag">Photography</span>
            <span className="htag">Video</span>
            <span className="htag">Podcast</span>
            <span className="htag">Lifestyle</span>
            <span className="htag">Fashion</span>
          </div>
        </div>
      </section>

      <section className="pricing-section">
        <div className="container">
          <div className="centered reveal" style={{ marginBottom: "2.5rem" }}>
            <p className="eyebrow">Packages</p>
            <h2 className="sec-title">Simple, transparent pricing.</h2>
          </div>
          <div className="pricing-grid">
            {PACKAGES.map((p) => (
              <div key={p.id} className={"price-card reveal" + (p.featured ? " featured" : "")}>
                {p.featured && <span className="featured-badge">Most Popular</span>}
                <div className="price-icon">{p.icon}</div>
                <div className="price-name">{p.name}</div>
                <div className="price-amount">{p.price}</div>
                <div className="price-duration">per {p.duration}</div>
                <ul className="price-features">
                  {p.features.map((f) => <li key={f}>{f}</li>)}
                </ul>
              </div>
            ))}
          </div>
          <div className="add-ons reveal">
            <h4>Add-ons</h4>
            <div className="add-ons-grid">
              {ADDONS.map((a) => (
                <div key={a.name} className="addon">
                  <span>{a.name}</span><span className="addon-price">{a.price}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="showcase-section">
        <div className="container">
          <div className="centered reveal" style={{ marginBottom: "2rem" }}>
            <p className="eyebrow">The Space</p>
            <h2 className="sec-title">Everything you need on set.</h2>
          </div>
          <div className="showcase-grid">
            {SHOWCASE.map((s) => (
              <div key={s.title} className="showcase-item reveal">
                <div className="showcase-icon">{s.icon}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="booking-section" id="book">
        <div className="container">
          <div className="booking-layout">
            <div className="booking-info reveal">
              <p className="eyebrow">Book a Session</p>
              <h2>Reserve your slot.</h2>
              <p>Pick a date, time and package. We'll confirm via WhatsApp within a few hours.</p>

              <div className="info-box">
                <h4>Studio Info</h4>
                <div className="info-row"><span>Location</span><span>Babcock Campus, Block C</span></div>
                <div className="info-row"><span>Hours</span><span>9 AM — 9 PM Daily</span></div>
                <div className="info-row"><span>Capacity</span><span>Up to 8 people</span></div>
              </div>

              <div className="info-box">
                <h4>How it works</h4>
                <div className="process-steps">
                  <div className="pstep"><div className="pstep-num">1</div><div><h4>Submit request</h4><p>Pick a slot and package and tell us about your shoot.</p></div></div>
                  <div className="pstep"><div className="pstep-num">2</div><div><h4>Confirmation</h4><p>We confirm availability over WhatsApp within hours.</p></div></div>
                  <div className="pstep"><div className="pstep-num">3</div><div><h4>Show up & shoot</h4><p>Arrive 10 minutes early. The studio is yours.</p></div></div>
                </div>
              </div>
            </div>

            <div className="form-card reveal">
              {!done ? (
                <form onSubmit={submit} noValidate>
                  <h3 className="form-title">Booking Details</h3>
                  <p className="form-sub">All fields required unless marked optional.</p>

                  <div className="fg">
                    <label>Date *</label>
                    <input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} />
                  </div>

                  <div className="fg">
                    <label>Time Slot *</label>
                    <div className="slots-grid">
                      {SLOTS.map((s) => {
                        const isBooked = booked.has(s);
                        return (
                          <button
                            key={s}
                            type="button"
                            className={"slot" + (slot === s ? " selected" : "") + (isBooked ? " booked" : "")}
                            onClick={() => !isBooked && setSlot(s)}
                            disabled={isBooked}
                          >{s}</button>
                        );
                      })}
                    </div>
                    {loadingSlots && <div className="form-note">Checking availability…</div>}
                    <div className="slot-legend">
                      <span><span className="dot dot-avail" /> Available</span>
                      <span><span className="dot dot-sel" /> Selected</span>
                      <span><span className="dot dot-booked" /> Booked</span>
                    </div>
                  </div>

                  <div className="fg">
                    <label>Package *</label>
                    <div className="package-grid">
                      {PACKAGES.map((p) => (
                        <div
                          key={p.id}
                          className={"pkg-option" + (pkg === p.id ? " selected" : "")}
                          onClick={() => setPkg(p.id)}
                        >
                          <div>
                            <div className="pkg-name">{p.name}</div>
                            <div className="pkg-dur">{p.duration}</div>
                          </div>
                          <div className="pkg-price">{p.price}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="frow">
                    <div className="fg">
                      <label>Full Name *</label>
                      <input value={name} maxLength={100} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
                    </div>
                    <div className="fg">
                      <label>Phone *</label>
                      <input type="tel" value={phone} maxLength={20} onChange={(e) => setPhone(e.target.value)} placeholder="+234 ..." />
                    </div>
                  </div>

                  <div className="fg">
                    <label>Email *</label>
                    <input type="email" value={email} maxLength={255} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                  </div>

                  <div className="fg">
                    <label>Project Type *</label>
                    <input value={project} maxLength={200} onChange={(e) => setProject(e.target.value)} placeholder="e.g. Lookbook shoot, podcast episode..." />
                  </div>

                  <div className="fg">
                    <label>Notes (optional)</label>
                    <textarea rows={3} value={notes} maxLength={1000} onChange={(e) => setNotes(e.target.value)} placeholder="Crew size, lighting needs, references..." />
                  </div>

                  <button type="submit" className="btn-submit" disabled={submitting}>{submitting ? "Submitting…" : "Request Booking →"}</button>
                  {err && <div className="ferr">{err}</div>}
                  <p className="form-note">Bookings are confirmed via WhatsApp. Payment due 24 hours before your session.</p>
                </form>
              ) : (
                <div className="fsuccess">
                  <div className="icon">✅</div>
                  <h4>Booking Request Sent</h4>
                  <p>We'll confirm <strong>{chosen?.name}</strong> on <strong>{date}</strong> at <strong>{slot}</strong> shortly. Tap below to send the request to our admin team.</p>
                  <a href={whatsappLink()} target="_blank" rel="noreferrer" className="btn-wa">Send via WhatsApp</a>
                  <div style={{ marginTop: "1rem" }}>
                    <button className="btn-secondary" onClick={() => { setDone(false); setSlot(""); }}>Book another</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <TclFooter />
    </>
  );
}