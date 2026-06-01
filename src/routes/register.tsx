import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { TclNav, TclFooter } from "@/components/TclNav";
import { ToastProvider, useReveal, useToast } from "@/lib/tcl-toast";
import { useSettings } from "@/lib/tcl-config";
import { COMMITTEES, GENERAL_QUESTIONS, type Committee, type Question } from "@/lib/tcl-committees";
import { submitRegistration } from "@/lib/tcl-backend.functions";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Join TCL Babcock — Member Registration" },
      { name: "description", content: "Apply to join The Campus Lifestyle at Babcock University. Pick a committee, complete the application, and join the community." },
      { property: "og:title", content: "Join TCL Babcock — Member Registration" },
      { property: "og:description", content: "Pick a committee and apply to join TCL Babcock." },
    ],
  }),
  component: () => (
    <ToastProvider>
      <RegisterPage />
    </ToastProvider>
  ),
});

const STORAGE_KEY = "tcl_register_state_v1";

type PersistedState = {
  step: 1 | 2 | 3;
  committeeId: string;
  values: Record<string, string | string[]>;
};

function loadPersisted(): PersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      (parsed.step === 1 || parsed.step === 2 || parsed.step === 3) &&
      typeof parsed.committeeId === "string" &&
      parsed.values && typeof parsed.values === "object"
    ) {
      return parsed as PersistedState;
    }
  } catch {
    // ignore
  }
  return null;
}

function RegisterPage() {
  useReveal();
  const submit = useServerFn(submitRegistration);
  const initial = typeof window !== "undefined" ? loadPersisted() : null;
  const [step, setStep] = useState<1 | 2 | 3>(initial?.step ?? 1);
  const [committeeId, setCommitteeId] = useState<string>(initial?.committeeId ?? "");
  const [values, setValues] = useState<Record<string, string | string[]>>(initial?.values ?? {});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [topError, setTopError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ step, committeeId, values }),
      );
    } catch {
      // ignore quota / disabled storage
    }
  }, [step, committeeId, values]);

  function resetRegistration() {
    if (typeof window !== "undefined") {
      try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
    }
    setStep(1);
    setCommitteeId("");
    setValues({});
    setErrors({});
    setTopError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const committee = useMemo(() => COMMITTEES.find((c) => c.id === committeeId), [committeeId]);

  function getStr(id: string) {
    const v = values[id];
    return typeof v === "string" ? v : "";
  }
  function getArr(id: string) {
    const v = values[id];
    return Array.isArray(v) ? v : [];
  }
  function setVal(id: string, v: string | string[]) {
    setValues((p) => ({ ...p, [id]: v }));
    setErrors((p) => {
      if (!p[id]) return p;
      const n = { ...p };
      delete n[id];
      return n;
    });
  }
  function toggleCheck(id: string, opt: string) {
    const cur = getArr(id);
    setVal(id, cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt]);
  }

  const PROFILE_FIELDS: Question[] = [
    { id: "fullname", type: "text", label: "Full name", required: true, placeholder: "First and last name" },
    { id: "email", type: "email", label: "Email address", required: true, placeholder: "you@example.com" },
    { id: "phone", type: "tel", label: "WhatsApp phone number", required: true, placeholder: "+234 ..." },
    { id: "matric", type: "text", label: "Matric number", required: true, placeholder: "e.g. 21/1234" },
  ];

  function validate(): boolean {
    const all = [...PROFILE_FIELDS, ...GENERAL_QUESTIONS, ...(committee?.questions ?? [])];
    const next: Record<string, string> = {};
    for (const q of all) {
      if (!q.required) continue;
      if (q.type === "checkbox") {
        if (getArr(q.id).length === 0) next[q.id] = "Please pick at least one.";
      } else if (q.type === "scale") {
        if (!getStr(q.id)) next[q.id] = "Please rate this.";
      } else {
        const v = getStr(q.id).trim();
        if (!v) next[q.id] = "This field is required.";
        else if (v.length > 1000) next[q.id] = "Please keep under 1000 characters.";
        else if (q.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) next[q.id] = "Enter a valid email.";
        else if (q.type === "tel" && !/^[+\d][\d\s\-()]{6,20}$/.test(v)) next[q.id] = "Enter a valid phone number.";
        else if (q.type === "url" && !/^https?:\/\/\S+\.\S+/.test(v)) next[q.id] = "Enter a valid URL (https://...).";
      }
    }
    setErrors(next);
    if (Object.keys(next).length) {
      setTopError("Please complete the highlighted fields before submitting.");
      return false;
    }
    setTopError("");
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!committee) return;
    if (!validate()) {
      const firstError = document.querySelector(".ferr-field");
      if (firstError) firstError.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setSubmitting(true);
    try {
      const answers: Record<string, string | string[]> = {};
      [...GENERAL_QUESTIONS, ...committee.questions].forEach((q) => {
        const v = values[q.id];
        if (v !== undefined) answers[q.id] = v;
      });
      const res = await submit({
        data: {
          committeeId: committee.id,
          committeeName: committee.name,
          fullName: getStr("fullname"),
          email: getStr("email"),
          phone: getStr("phone"),
          matric: getStr("matric"),
          answers,
        },
      });
      if (!res.ok) {
        setTopError(res.error);
        setSubmitting(false);
        return;
      }
      if (typeof window !== "undefined") {
        (window as any).gtag?.("event", "registration_submit", { committee: committee.id });
      }
      setStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
      // Clear persisted draft now that the submission succeeded
      if (typeof window !== "undefined") {
        try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
      }
      setValues({});
      setCommitteeId(committee.id);
    } catch (err) {
      console.error(err);
      setTopError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function buildWhatsAppMessage() {
    if (!committee) return "";
    const lines: string[] = [];
    lines.push(`*TCL Babcock — New Member Application*`);
    lines.push(`Committee: ${committee.name}`);
    lines.push("");
    lines.push("*Profile*");
    PROFILE_FIELDS.forEach((q) => lines.push(`• ${q.label}: ${getStr(q.id)}`));
    lines.push("");
    lines.push("*General*");
    GENERAL_QUESTIONS.forEach((q) => {
      const v = values[q.id];
      lines.push(`• ${q.label}: ${Array.isArray(v) ? v.join(", ") : v ?? ""}`);
    });
    lines.push("");
    lines.push(`*${committee.name} Questions*`);
    committee.questions.forEach((q) => {
      const v = values[q.id];
      lines.push(`• ${q.label}: ${Array.isArray(v) ? v.join(", ") : v ?? ""}`);
    });
    return encodeURIComponent(lines.join("\n"));
  }

  return (
    <>
      <TclNav variant="back" />
      {step === 1 && (
        <CommitteeStep
          selected={committeeId}
          onSelect={setCommitteeId}
          onContinue={() => { setStep(2); window.scrollTo({ top: 0, behavior: "smooth" }); }}
        />
      )}
      {step === 2 && committee && (
        <FormStep
          committee={committee}
          profileFields={PROFILE_FIELDS}
          generalQuestions={GENERAL_QUESTIONS}
          values={values}
          errors={errors}
          topError={topError}
          getStr={getStr}
          getArr={getArr}
          setVal={setVal}
          toggleCheck={toggleCheck}
          onBack={() => setStep(1)}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      )}
      {step === 3 && committee && (
        <SuccessStep
          committeeName={committee.name}
          waMessage={buildWhatsAppMessage()}
        />
      )}
      <TclFooter />
    </>
  );
}

function CommitteeStep({ selected, onSelect, onContinue }: { selected: string; onSelect: (id: string) => void; onContinue: () => void }) {
  return (
    <section className="reg-landing">
      <div className="landing-inner">
        <div className="landing-logo">TCL</div>
        <h1>Join The Campus Lifestyle.</h1>
        <p>Babcock's creative community for student innovators. Pick the committee that fits you best — you can also opt into our General channel for everyone.</p>

        <p className="picker-label">Step 1 of 3 · Choose your committee</p>
        <div className="committees-picker">
          {COMMITTEES.map((c) => (
            <button
              key={c.id}
              type="button"
              className={"comm-pick" + (selected === c.id ? " selected" : "")}
              onClick={() => onSelect(c.id)}
              aria-pressed={selected === c.id}
            >
              <span className="comm-pick-icon">{c.icon}</span>
              <span className="comm-pick-name">{c.name}</span>
              <span className="comm-pick-desc">{c.tagline}</span>
            </button>
          ))}
        </div>

        <div className="also-general">
          <p><strong>Not sure?</strong> You'll be asked about general community access on the next step — everyone is welcome.</p>
        </div>

        <div className="landing-btns">
          <button
            type="button"
            className="btn-primary"
            disabled={!selected}
            onClick={onContinue}
          >
            Continue →
          </button>
          <Link to="/" className="btn-secondary">Cancel</Link>
        </div>
      </div>
    </section>
  );
}

function FormStep(props: {
  committee: Committee;
  profileFields: Question[];
  generalQuestions: Question[];
  values: Record<string, string | string[]>;
  errors: Record<string, string>;
  topError: string;
  getStr: (id: string) => string;
  getArr: (id: string) => string[];
  setVal: (id: string, v: string | string[]) => void;
  toggleCheck: (id: string, opt: string) => void;
  onBack: () => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting?: boolean;
}) {
  const { committee, profileFields, generalQuestions, errors, topError, getStr, getArr, setVal, toggleCheck, onBack, onSubmit, submitting } = props;

  return (
    <section className="reg-form-wrap">
      <div className="form-page">
        <div className="progress-bar"><div className="progress-fill" style={{ width: "66%" }} /></div>

        <div className="comm-header">
          <span className="comm-header-icon">{committee.icon}</span>
          <div>
            <div className="comm-header-name">{committee.name}</div>
            <div className="comm-header-desc">{committee.desc}</div>
          </div>
          <span className="comm-header-badge">Step 2 of 3</span>
        </div>

        <form onSubmit={onSubmit} noValidate>
          <Section title="Your Profile">
            <div className="frow">
              {profileFields.map((q) => (
                <Field key={q.id} q={q} value={getStr(q.id)} error={errors[q.id]} onChange={(v) => setVal(q.id, v)} />
              ))}
            </div>
          </Section>

          <Section title="About You at Babcock">
            {generalQuestions.map((q) => (
              <Field
                key={q.id}
                q={q}
                value={q.type === "checkbox" ? getArr(q.id) : getStr(q.id)}
                error={errors[q.id]}
                onChange={(v) => setVal(q.id, v)}
                onToggle={(opt) => toggleCheck(q.id, opt)}
              />
            ))}
          </Section>

          <Section title={`${committee.name} Questions`}>
            {committee.questions.map((q) => (
              <Field
                key={q.id}
                q={q}
                value={q.type === "checkbox" ? getArr(q.id) : getStr(q.id)}
                error={errors[q.id]}
                onChange={(v) => setVal(q.id, v)}
                onToggle={(opt) => toggleCheck(q.id, opt)}
              />
            ))}
          </Section>

          <div className="form-submit-area">
            <button type="submit" className="btn-submit" disabled={submitting}>{submitting ? "Submitting…" : "Submit Application →"}</button>
            {topError && <div className="ferr">{topError}</div>}
            <p className="form-note">
              By submitting, you agree to be contacted via the WhatsApp number you provided.
              You'll receive a link to TCL's community group after review.
            </p>
            <div style={{ textAlign: "center", marginTop: "1rem" }}>
              <button type="button" className="btn-secondary" onClick={onBack}>← Change committee</button>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="form-section">
      <h3 className="form-section-title">{title}</h3>
      {children}
    </div>
  );
}

function Field({
  q, value, error, onChange, onToggle,
}: {
  q: Question;
  value: string | string[];
  error?: string;
  onChange: (v: string | string[]) => void;
  onToggle?: (opt: string) => void;
}) {
  const v = typeof value === "string" ? value : "";
  const arr = Array.isArray(value) ? value : [];
  return (
    <div className={"fg" + (error ? " ferr-field" : "")}>
      <label>
        {q.label} {q.required && <span className="req">*</span>}
      </label>
      {q.type === "text" || q.type === "email" || q.type === "tel" || q.type === "url" ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type={q.type === "url" ? "url" : q.type}
            value={v}
            onChange={(e) => onChange(e.target.value)}
            placeholder={q.placeholder}
            maxLength={255}
            aria-invalid={!!error}
            aria-describedby={error ? `${q.id}-error` : undefined}
          />
          <div className="charcount">{v.length}/255</div>
        </div>
      ) : q.type === "textarea" ? (
        <div style={{ position: 'relative' }}>
          <textarea
            rows={4}
            value={v}
            onChange={(e) => onChange(e.target.value)}
            placeholder={q.placeholder}
            maxLength={1000}
            aria-invalid={!!error}
            aria-describedby={error ? `${q.id}-error` : undefined}
          />
          <div className="charcount" style={{ position: 'absolute', right: 8, bottom: 8 }}>{v.length}/1000</div>
        </div>
      ) : q.type === "select" ? (
        <select value={v} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select…</option>
          {q.options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : q.type === "radio" ? (
        <div className="radio-grid">
          {q.options.map((o) => (
            <label key={o} className={"radio-item" + (v === o ? " checked" : "")}>
              <input type="radio" name={q.id} checked={v === o} onChange={() => onChange(o)} />
              <span>{o}</span>
            </label>
          ))}
        </div>
      ) : q.type === "checkbox" ? (
        <div className="check-grid">
          {q.options.map((o) => (
            <label key={o} className={"check-item" + (arr.includes(o) ? " checked" : "")}>
              <input type="checkbox" checked={arr.includes(o)} onChange={() => onToggle?.(o)} />
              <span>{o}</span>
            </label>
          ))}
        </div>
      ) : q.type === "scale" ? (
        <div>
          <div className="scale-row">
            {Array.from({ length: q.max - q.min + 1 }).map((_, i) => {
              const n = (q.min + i).toString();
              return (
                <button key={n} type="button" className={"scale-btn" + (v === n ? " selected" : "")} onClick={() => onChange(n)}>
                  {n}
                </button>
              );
            })}
          </div>
          <div className="scale-labels"><span>{q.minLabel}</span><span>{q.maxLabel}</span></div>
        </div>
      ) : null}
      {error && <div className="ferr" style={{ marginTop: "0.5rem" }}>{error}</div>}
    </div>
  );
}

function SuccessStep({ committeeName, waMessage }: { committeeName: string; waMessage: string }) {
  const show = useToast();
  const settings = useSettings();
  const adminLink = settings.adminWhatsapp
    ? `https://wa.me/${settings.adminWhatsapp}?text=${waMessage}`
    : "";
  const gcLink = settings.waGcLink || "";
  return (
    <section className="success-wrap">
      <div className="progress-bar" style={{ maxWidth: 560, margin: "0 auto 2rem" }}>
        <div className="progress-fill" style={{ width: "100%" }} />
      </div>
      <div className="success-inner">
        <div className="success-icon">🎉</div>
        <h2>Application Received!</h2>
        <p>Thanks for applying to the <strong>{committeeName}</strong>. The next step is to send your details to the TCL admin team on WhatsApp — tap below and hit send.</p>

        <div className="wa-box">
          <h3>Send to TCL Admin</h3>
          <p>This opens WhatsApp with your application pre-filled. Just tap send.</p>
          {adminLink ? <a
            href={adminLink}
            target="_blank"
            rel="noreferrer"
            className="btn-wa"
            onClick={() => show("Opening WhatsApp…", "💬")}
          >Send via WhatsApp</a> : <p className="form-note">Admin WhatsApp not configured yet — please contact TCL directly.</p>}
        </div>

        <div className="wa-box">
          <h3>Join the TCL Community Group</h3>
          <p>Once approved, you'll be added to your committee channel. In the meantime, join the general TCL Babcock WhatsApp community.</p>
          {gcLink ? <a href={gcLink} target="_blank" rel="noreferrer" className="btn-wa">Join Community Group</a> : <p className="form-note">Community group link not configured yet.</p>}
        </div>

        <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
          <Link to="/" className="btn-secondary">Back to home</Link>
          <Link to="/status" style={{ fontSize: "0.88rem", color: "#a855f7", textDecoration: "none", fontWeight: 600 }}>Check your application status →</Link>
        </div>
      </div>
    </section>
  );
}