import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Lightweight constant-time compare to avoid timing attacks for admin password
function ctEqual(a: string, b: string): boolean {
  const PAD = 256;
  const pa = a.padEnd(PAD, "\0").slice(0, PAD);
  const pb = b.padEnd(PAD, "\0").slice(0, PAD);
  let diff = 0;
  for (let i = 0; i < PAD; i++) diff |= pa.charCodeAt(i) ^ pb.charCodeAt(i);
  return diff === 0 && a.length === b.length;
}

function requireAdminPwd(password: string) {
  const expected = process.env.ADMIN_PASSWORD ?? "";
  if (!expected) throw new Error("Admin password not configured.");
  if (!ctEqual(password, expected)) throw new Error("Unauthorized");
}

// Public endpoint: try to read site_committees and site_team tables if present.
export const getSiteContent = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const sa: any = supabaseAdmin as any;
      const { data: committees, error: cErr } = await sa
        .from("site_committees")
        .select("id, name, description, tagline, icon, director, highlights, extra, image")
        .order("created_at", { ascending: true });

      const { data: team, error: tErr } = await sa
        .from("site_team")
        .select("id, name, role, dept, image_url")
        .order("sort_order", { ascending: true });

      if (cErr && cErr.code === "42P01") {
        // relation does not exist — caller should fallback to defaults
        return { committees: null, team: null };
      }
      if (tErr && tErr.code === "42P01") return { committees: committees ?? null, team: null };
      return { committees: committees ?? null, team: team ?? null };
    } catch (err) {
      return { committees: null, team: null };
    }
  });

// Admin endpoints to upsert content. Requires admin password.
export const adminUpsertCommittee = createServerFn({ method: "POST" })
  .handler(async ({ data }) => {
    const { password, committee } = data as any;
    requireAdminPwd(password);
    if (!committee || !committee.id) throw new Error("Missing committee payload");
    // Try upsert — table may not exist on older deployments
    const sa: any = supabaseAdmin as any;
    const { error } = await sa.from("site_committees").upsert(committee, { onConflict: "id" });
    if (error) throw error;
    return { ok: true };
  });

export const adminDeleteCommittee = createServerFn({ method: "POST" })
  .handler(async ({ data }) => {
    const { password, id } = data as any;
    requireAdminPwd(password);
    if (!id) throw new Error("Missing id");
    const sa: any = supabaseAdmin as any;

    const { data: existingCommittee } = await sa
      .from("site_committees")
      .select("image")
      .eq("id", id)
      .maybeSingle();

    const imageUrl = existingCommittee?.image;
    if (typeof imageUrl === "string" && imageUrl.includes("/storage/v1/object/public/site-assets/")) {
      const parts = imageUrl.split("/storage/v1/object/public/site-assets/");
      const path = parts[1];
      if (path) {
        await sa.storage.from("site-assets").remove([path]);
      }
    }

    const { error } = await sa.from("site_committees").delete().eq("id", id);
    if (error) throw error;
    return { ok: true };
  });

export const adminUpsertTeam = createServerFn({ method: "POST" })
  .handler(async ({ data }) => {
    const { password, member } = data as any;
    requireAdminPwd(password);
    if (!member || !member.id) throw new Error("Missing member payload");
    const sa: any = supabaseAdmin as any;
    const { error } = await sa.from("site_team").upsert(member, { onConflict: "id" });
    if (error) throw error;
    return { ok: true };
  });

export const adminDeleteTeam = createServerFn({ method: "POST" })
  .handler(async ({ data }) => {
    const { password, id } = data as any;
    requireAdminPwd(password);
    if (!id) throw new Error("Missing id");
    const sa: any = supabaseAdmin as any;

    // Delete the stored image file if this member used the site-assets bucket.
    const { data: existingMember } = await sa
      .from("site_team")
      .select("image_url")
      .eq("id", id)
      .maybeSingle();

    const imageUrl = existingMember?.image_url;
    if (typeof imageUrl === "string" && imageUrl.includes("/storage/v1/object/public/site-assets/")) {
      const parts = imageUrl.split("/storage/v1/object/public/site-assets/");
      const path = parts[1];
      if (path) {
        await sa.storage.from("site-assets").remove([path]);
      }
    }

    const { error } = await sa.from("site_team").delete().eq("id", id);
    if (error) throw error;
    return { ok: true };
  });
