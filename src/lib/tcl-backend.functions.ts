import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const RegistrationInput = z.object({
  committeeId: z.string().min(1).max(64),
  committeeName: z.string().min(1).max(120),
  fullName: z.string().min(1).max(120),
  email: z.string().email().max(255),
  phone: z.string().min(6).max(30),
  matric: z.string().min(1).max(40),
  answers: z.record(z.string(), z.union([z.string(), z.array(z.string())])),
});

export const submitRegistration = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => RegistrationInput.parse(input))
  .handler(async ({ data }) => {
    const { error, data: row } = await supabase
      .from("registrations")
      .insert({
        committee_id: data.committeeId,
        committee_name: data.committeeName,
        full_name: data.fullName,
        email: data.email,
        phone: data.phone,
        matric: data.matric,
        answers: data.answers,
      })
      .select("id")
      .single();
    if (error) {
      console.error("submitRegistration failed:", error);
      return { ok: false as const, error: "Could not save your application. Please try again." };
    }
    return { ok: true as const, id: row.id };
  });

const BookingInput = z.object({
  bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeSlot: z.string().min(1).max(20),
  packageId: z.string().min(1).max(40),
  packageName: z.string().min(1).max(80),
  fullName: z.string().min(1).max(120),
  email: z.string().email().max(255),
  phone: z.string().min(6).max(30),
  projectType: z.string().min(1).max(200),
  notes: z.string().max(1000).optional().default(""),
});

export const createBooking = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => BookingInput.parse(input))
  .handler(async ({ data }) => {
    const { error, data: row } = await supabase
      .from("studio_bookings")
      .insert({
        booking_date: data.bookingDate,
        time_slot: data.timeSlot,
        package_id: data.packageId,
        package_name: data.packageName,
        full_name: data.fullName,
        email: data.email,
        phone: data.phone,
        project_type: data.projectType,
        notes: data.notes ?? null,
      })
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505") {
        return { ok: false as const, error: "That slot was just taken. Please pick another time." };
      }
      console.error("createBooking failed:", error);
      return { ok: false as const, error: "Could not save your booking. Please try again." };
    }
    return { ok: true as const, id: row.id };
  });

const SlotsInput = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const listBookedSlots = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SlotsInput.parse(input))
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabase
      .from("studio_booked_slots")
      .select("time_slot")
      .eq("booking_date", data.date);
    if (error) {
      console.error("listBookedSlots failed:", error);
      return { ok: false as const, slots: [] as string[] };
    }
    return { ok: true as const, slots: (rows ?? []).map((r) => r.time_slot as string) };
  });

// ---------- Public settings ----------

export type PublicSettings = {
  hourlyPriceNaira: number;
  halfDayPriceNaira: number;
  fullDayPriceNaira: number;
  podcastPriceNaira: number;
  adminWhatsapp: string;
  waGcLink: string;
  gaMeasurementId: string;
};

const DEFAULT_SETTINGS: PublicSettings = {
  hourlyPriceNaira: 8000,
  halfDayPriceNaira: 25000,
  fullDayPriceNaira: 45000,
  podcastPriceNaira: 15000,
  adminWhatsapp: "",
  waGcLink: "",
  gaMeasurementId: "",
};

export const getPublicSettings = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabase
    .from("app_settings")
    .select("hourly_price_naira, half_day_price_naira, full_day_price_naira, podcast_price_naira, admin_whatsapp, wa_gc_link, ga_measurement_id")
    .eq("id", 1)
    .maybeSingle();
  if (error || !data) return DEFAULT_SETTINGS;
  return {
    hourlyPriceNaira: data.hourly_price_naira,
    halfDayPriceNaira: data.half_day_price_naira,
    fullDayPriceNaira: data.full_day_price_naira,
    podcastPriceNaira: data.podcast_price_naira,
    adminWhatsapp: data.admin_whatsapp ?? "",
    waGcLink: data.wa_gc_link ?? "",
    gaMeasurementId: data.ga_measurement_id ?? "",
  } satisfies PublicSettings;
});