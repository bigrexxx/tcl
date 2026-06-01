import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";

const ADMIN_SESSION_COOKIE = "tcl_admin_session";
const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60;

function ctEqual(a: string, b: string): boolean {
  const PAD = 256;
  const pa = a.padEnd(PAD, "\0").slice(0, PAD);
  const pb = b.padEnd(PAD, "\0").slice(0, PAD);
  let diff = 0;
  for (let i = 0; i < PAD; i++) diff |= pa.charCodeAt(i) ^ pb.charCodeAt(i);
  return diff === 0 && a.length === b.length;
}

function base64UrlEncode(value: string): string {
  const base64 = typeof btoa !== "undefined"
    ? btoa(value)
    : Buffer.from(value, "utf8").toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice(0, (4 - value.length % 4) % 4);
  return typeof atob !== "undefined"
    ? atob(padded)
    : Buffer.from(padded, "base64").toString("utf8");
}

async function sha256Hex(message: string): Promise<string> {
  const data = new TextEncoder().encode(message);
  const subtle = (globalThis as any).crypto?.subtle;
  const hashBuffer = subtle?.digest
    ? await subtle.digest("SHA-256", data)
    : await (await import("crypto")).webcrypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function signPayload(payload: string): Promise<string> {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("Admin session secret not configured. Set ADMIN_SESSION_SECRET in environment.");
  return sha256Hex(`${payload}.${secret}`);
}

export async function createAdminSessionToken(username: string): Promise<string> {
  const payload = JSON.stringify({ u: username, e: Date.now() + ADMIN_SESSION_MAX_AGE_SECONDS * 1000 });
  const signature = await signPayload(payload);
  return `${base64UrlEncode(payload)}.${signature}`;
}

export async function verifyAdminSessionToken(token: string): Promise<{ ok: boolean; username?: string }> {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return { ok: false };

  const payload = base64UrlDecode(encodedPayload);
  const expected = await signPayload(payload);
  if (!ctEqual(signature, expected)) return { ok: false };

  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    return { ok: false };
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as any).u !== "string" ||
    typeof (parsed as any).e !== "number" ||
    Date.now() > (parsed as any).e
  ) {
    return { ok: false };
  }

  return { ok: true, username: (parsed as any).u };
}

export function getAdminSessionCookie(request: Request): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  const match = header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ADMIN_SESSION_COOKIE}=`));
  return match ? match.slice(ADMIN_SESSION_COOKIE.length + 1) : null;
}

export function requireAdmin(username: string, password: string): string {
  const expectedUser = process.env.ADMIN_USERNAME ?? "tcl@admin";
  const expectedPassword = process.env.ADMIN_PASSWORD ?? "";
  if (!expectedPassword) throw new Error("Admin password not configured.");
  if (!ctEqual(username, expectedUser) || !ctEqual(password, expectedPassword)) throw new Error("Unauthorized");
  return expectedUser;
}

export function requireAdminPassword(password: string): string {
  const expected = process.env.ADMIN_PASSWORD ?? "";
  if (!expected) throw new Error("Admin password not configured.");
  if (!ctEqual(password, expected)) throw new Error("Unauthorized");
  return process.env.ADMIN_USERNAME ?? "tcl@admin";
}

export async function requireAdminAuth(request: Request | undefined, password?: string): Promise<string> {
  if (request) {
    const token = getAdminSessionCookie(request);
    if (token) {
      const result = await verifyAdminSessionToken(token);
      if (result.ok) return result.username!;
    }
  }
  if (password) {
    return requireAdminPassword(password);
  }
  throw new Error("Unauthorized");
}

export async function recordAdminHistory(
  actor: string,
  action: string,
  entity: string,
  entityId?: string,
  details?: Json | null,
) {
  const { error } = await supabaseAdmin
    .from("admin_history")
    .insert([{ actor, action, entity, entity_id: entityId ?? null, details: details ?? null }]);
  if (error) throw new Error(error.message);
}

export const AdminLogin = z.object({
  username: z.string().min(1).max(200),
  password: z.string().min(1).max(200),
});

export const AdminAuthBase = z.object({
  password: z.string().min(1).max(200).optional(),
});

export const AdminAuth = AdminAuthBase;

export type AdminAuthInput = z.infer<typeof AdminAuthBase>;
