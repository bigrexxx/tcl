// TCL Babcock site-wide settings — sourced from the `app_settings` table
// and editable from the admin dashboard. Use the `useSettings()` hook in
// React components and `getPublicSettings()` from server functions.
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getPublicSettings, type PublicSettings } from "@/lib/tcl-backend.functions";

export const DEFAULT_PUBLIC_SETTINGS: PublicSettings = {
  hourlyPriceNaira: 8000,
  halfDayPriceNaira: 25000,
  fullDayPriceNaira: 45000,
  podcastPriceNaira: 15000,
  adminWhatsapp: "",
  waGcLink: "",
  gaMeasurementId: "",
};

export function formatNaira(amount: number): string {
  return "₦" + amount.toLocaleString("en-NG");
}

/** Lightweight client-side hook to read settings from the public table. */
export function useSettings(): PublicSettings {
  const fetchSettings = useServerFn(getPublicSettings);
  const [s, setS] = useState<PublicSettings>(DEFAULT_PUBLIC_SETTINGS);
  useEffect(() => {
    let cancelled = false;
    fetchSettings()
      .then((res) => { if (!cancelled && res) setS(res); })
      .catch(() => { /* keep defaults */ });
    return () => { cancelled = true; };
  }, [fetchSettings]);
  return s;
}