import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

type Toast = { id: number; msg: string; icon: string };
const Ctx = createContext<(msg: string, icon?: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const show = useCallback((msg: string, icon = "✅") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, icon }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);
  return (
    <Ctx.Provider value={show}>
      {children}
      <div className="toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className="toast-item"><span>{t.icon}</span><span>{t.msg}</span></div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
export const useToast = () => useContext(Ctx);

export function useReveal() {
  useEffect(() => {
    const obs = new IntersectionObserver(
      (e) => e.forEach((x) => x.isIntersecting && x.target.classList.add("visible")),
      { threshold: 0.1 }
    );
    document.querySelectorAll(".reveal").forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);
}
