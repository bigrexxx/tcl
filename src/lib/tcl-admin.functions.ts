import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  createAdminSessionToken,
  getAdminSessionCookie,
  recordAdminHistory,
  requireAdmin,
  requireAdminAuth,
  requireAdminPassword,
  verifyAdminSessionToken,
  AdminAuth,
  AdminAuthBase,
  AdminLogin,
} from "@/lib/tcl-admin-auth.server";
import {
  sendEmail,
  buildApprovalEmail,
  buildDeclinedEmail,
  buildBookingConfirmedEmail,
  buildBookingDeclinedEmail,
} from "@/lib/tcl-email";

export const adminVerifyPassword = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AdminLogin.parse(input))
  .handler(async ({ data }) => {
    try {
      requireAdmin(data.username, data.password);
      const token = await createAdminSessionToken(data.username);
      return { ok: true as const, token };
    } catch {
      return { ok: false as const, error: "Invalid credentials" };
    }
  });

export const adminCheckSession = createServerFn({ method: "GET" })
  .handler(async ({ request }: any) => {
    const token = getAdminSessionCookie(request);
    if (!token) return { ok: false as const };
    const result = await verifyAdminSessionToken(token);
    if (!result.ok) return { ok: false as const };
    return { ok: true as const, username: result.username };
  });

export const adminListHistory = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AdminAuth.parse(input))
  .handler(async ({ data, request }: any) => {
    await requireAdminAuth(request, data.password);
    const { data: rows, error } = await supabaseAdmin
      .from("admin_history")
      .select("id, actor, action, entity, entity_id, details, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getSettings() {
  const { data } = await supabaseAdmin
    .from("app_settings")
    .select("wa_gc_link, admin_whatsapp")
    .eq("id", 1)
    .maybeSingle();
  return { waGcLink: data?.wa_gc_link ?? "", adminWhatsapp: data?.admin_whatsapp ?? "" };
}

// ─── Registrations ────────────────────────────────────────────────────────────

export const adminListRegistrations = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AdminAuth.parse(input))
  .handler(async ({ data, request }: any) => {
    await requireAdminAuth(request, data.password);
    const { data: rows, error } = await supabaseAdmin
      .from("registrations")
      .select(
        "id, committee_id, committee_name, full_name, email, phone, matric, status, approval_email_sent, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });

const UpdateRegistrationStatus = AdminAuthBase.extend({
  id: z.string().uuid(),
  status: z.enum(["pending", "approved", "declined"]),
});

export const adminUpdateRegistrationStatus = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => UpdateRegistrationStatus.parse(input))
  .handler(async ({ data, request }: any) => {
    const actor = await requireAdminAuth(request, data.password);

    // 1. Persist status change
    const { error: updateError } = await supabaseAdmin
      .from("registrations")
      .update({ status: data.status })
      .eq("id", data.id);
    if (updateError) throw new Error(updateError.message);

    const history: any = { status: data.status, emailSent: false, emailError: null };

    // 2. Fetch the registration row
    const { data: reg, error: fetchError } = await supabaseAdmin
      .from("registrations")
      .select("full_name, email, committee_name, approval_email_sent")
      .eq("id", data.id)
      .single();
    if (fetchError || !reg) {
      await recordAdminHistory(actor, `${data.status} registration`, "registration", data.id, history);
      return { ok: true as const, emailSent: false, emailError: "Could not fetch registration" };
    }

    // 3. Send appropriate email
    if (data.status === "approved") {
      if (reg.approval_email_sent) {
        history.emailError = "Approval email already sent";
        await recordAdminHistory(actor, "approved registration", "registration", data.id, history);
        return { ok: true as const, emailSent: false, emailError: null };
      }

      const { waGcLink } = await getSettings();
      if (!waGcLink) {
        history.emailError = "WhatsApp group link not configured";
        await recordAdminHistory(actor, "approved registration", "registration", data.id, history);
        return { ok: true as const, emailSent: false, emailError: "WhatsApp group link not configured in Settings" };
      }

      const tpl = buildApprovalEmail({ toName: reg.full_name, committeeName: reg.committee_name, waGcLink });
      const result = await sendEmail({ to: reg.email, ...tpl });

      if (result.ok) {
        history.emailSent = true;
        await supabaseAdmin
          .from("registrations")
          .update({ approval_email_sent: true, approval_email_sent_at: new Date().toISOString() })
          .eq("id", data.id);
      } else {
        history.emailError = result.error ?? "Unknown";
      }

      await recordAdminHistory(actor, "approved registration", "registration", data.id, history);
      return { ok: true as const, emailSent: result.ok, emailError: result.error ?? null };
    }

    if (data.status === "declined") {
      const tpl = buildDeclinedEmail({ toName: reg.full_name, committeeName: reg.committee_name });
      const result = await sendEmail({ to: reg.email, ...tpl });
      history.emailSent = result.ok;
      history.emailError = result.error ?? null;
      await recordAdminHistory(actor, "declined registration", "registration", data.id, history);
      return { ok: true as const, emailSent: result.ok, emailError: result.error ?? null };
    }

    await recordAdminHistory(actor, `${data.status} registration`, "registration", data.id, history);
    return { ok: true as const, emailSent: false, emailError: null };
  });

// ─── Check application status (public — no admin password) ────────────────────

const CheckStatusInput = z.object({
  email: z.string().email().max(255),
  matric: z.string().min(1).max(40),
});

export const checkApplicationStatus = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => CheckStatusInput.parse(input))
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabaseAdmin
      .from("registrations")
      .select("id, committee_name, status, created_at, full_name")
      .eq("email", data.email.toLowerCase().trim())
      .eq("matric", data.matric.trim())
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      console.error("checkApplicationStatus error:", error.message);
      return { ok: false as const, error: "Could not look up your application. Please try again." };
    }
    if (!rows || rows.length === 0) {
      return { ok: false as const, error: "No application found for that email and matric number." };
    }
    return {
      ok: true as const,
      applications: rows.map((r) => ({
        id: r.id,
        committeeName: r.committee_name,
        status: r.status as "pending" | "approved" | "declined",
        submittedAt: r.created_at,
        fullName: r.full_name,
      })),
    };
  });

// ─── Bookings ─────────────────────────────────────────────────────────────────

export const adminListBookings = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AdminAuth.parse(input))
  .handler(async ({ data, request }: any) => {
    await requireAdminAuth(request, data.password);
    const { data: rows, error } = await supabaseAdmin
      .from("studio_bookings")
      .select(
        "id, booking_date, time_slot, package_id, package_name, full_name, email, phone, project_type, notes, status, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });

const UpdateBookingStatus = AdminAuthBase.extend({
  id: z.string().uuid(),
  status: z.enum(["pending", "confirmed", "declined"]),
});

export const adminUpdateBookingStatus = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => UpdateBookingStatus.parse(input))
  .handler(async ({ data, request }: any) => {
    const actor = await requireAdminAuth(request, data.password);
    const history: any = { status: data.status, emailSent: false, emailError: null };

    // 1. Persist status
    const { error } = await supabaseAdmin
      .from("studio_bookings")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    // 2. Fetch booking for email
    const { data: booking, error: fetchError } = await supabaseAdmin
      .from("studio_bookings")
      .select("full_name, email, package_name, booking_date, time_slot")
      .eq("id", data.id)
      .single();

    if (fetchError || !booking) {
      await recordAdminHistory(actor, `${data.status} booking`, "booking", data.id, history);
      return { ok: true as const, emailSent: false, emailError: "Could not fetch booking" };
    }

    const { adminWhatsapp } = await getSettings();

    let tpl: { subject: string; html: string; text: string };
    if (data.status === "confirmed") {
      tpl = buildBookingConfirmedEmail({
        toName: booking.full_name,
        packageName: booking.package_name,
        bookingDate: booking.booking_date,
        timeSlot: booking.time_slot,
        adminWhatsapp,
      });
    } else if (data.status === "declined") {
      tpl = buildBookingDeclinedEmail({
        toName: booking.full_name,
        packageName: booking.package_name,
        bookingDate: booking.booking_date,
        timeSlot: booking.time_slot,
        adminWhatsapp,
      });
    } else {
      await recordAdminHistory(actor, `${data.status} booking`, "booking", data.id, history);
      return { ok: true as const, emailSent: false, emailError: null };
    }

    const result = await sendEmail({ to: booking.email, ...tpl });
    history.emailSent = result.ok;
    history.emailError = result.error ?? null;
    await recordAdminHistory(actor, `${data.status} booking`, "booking", data.id, history);
    return { ok: true as const, emailSent: result.ok, emailError: result.error ?? null };
  });

// ─── Settings ─────────────────────────────────────────────────────────────────

const UpdateSettings = AdminAuthBase.extend({
  hourlyPriceNaira: z.number().int().min(0).max(10_000_000),
  halfDayPriceNaira: z.number().int().min(0).max(10_000_000),
  fullDayPriceNaira: z.number().int().min(0).max(10_000_000),
  podcastPriceNaira: z.number().int().min(0).max(10_000_000),
  adminWhatsapp: z.string().max(30).regex(/^[0-9]*$/, "Digits only"),
  waGcLink: z
    .string()
    .max(500)
    .refine((v) => v === "" || /^https:\/\/.+/.test(v), "Must be a https:// URL or leave blank"),
  gaMeasurementId: z.string().max(40),
});

export const adminUpdateSettings = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => UpdateSettings.parse(input))
  .handler(async ({ data, request }: any) => {
    const actor = await requireAdminAuth(request, data.password);
    const { error } = await supabaseAdmin
      .from("app_settings")
      .update({
        hourly_price_naira: data.hourlyPriceNaira,
        half_day_price_naira: data.halfDayPriceNaira,
        full_day_price_naira: data.fullDayPriceNaira,
        podcast_price_naira: data.podcastPriceNaira,
        admin_whatsapp: data.adminWhatsapp,
        wa_gc_link: data.waGcLink,
        ga_measurement_id: data.gaMeasurementId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);
    if (error) throw new Error(error.message);
    await recordAdminHistory(actor, "updated settings", "settings", undefined, {
      hourlyPriceNaira: data.hourlyPriceNaira,
      halfDayPriceNaira: data.halfDayPriceNaira,
      fullDayPriceNaira: data.fullDayPriceNaira,
      podcastPriceNaira: data.podcastPriceNaira,
      adminWhatsapp: data.adminWhatsapp,
      waGcLink: data.waGcLink,
      gaMeasurementId: data.gaMeasurementId,
    });
    return { ok: true as const };
  });
