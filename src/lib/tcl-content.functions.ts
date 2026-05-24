import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminAuth, recordAdminHistory, AdminAuth } from "@/lib/tcl-admin-auth.server";

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
      console.error("getSiteContent failed", err);
      return { committees: null, team: null };
    }
  });

// Admin endpoints to upsert content. Requires admin password.
export const adminUpsertCommittee = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AdminAuth.parse(input))
  .handler(async ({ data, request }: any) => {
    const { password, committee } = data as any;
    const actor = await requireAdminAuth(request, password);
    if (!committee || !committee.id) throw new Error("Missing committee payload");
    const sa: any = supabaseAdmin as any;
    const { error } = await sa.from("site_committees").upsert(committee, { onConflict: "id" });
    if (error) throw error;
    await recordAdminHistory(actor, "upserted committee", "committee", committee.id, committee);
    return { ok: true };
  });

export const adminDeleteCommittee = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AdminAuth.parse(input))
  .handler(async ({ data, request }: any) => {
    const { password, id } = data as any;
    const actor = await requireAdminAuth(request, password);
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
    await recordAdminHistory(actor, "deleted committee", "committee", id, { imageUrl });
    return { ok: true };
  });

export const adminUpsertTeam = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AdminAuth.parse(input))
  .handler(async ({ data, request }: any) => {
    const { password, member } = data as any;
    const actor = await requireAdminAuth(request, password);
    if (!member || !member.id) throw new Error("Missing member payload");
    const sa: any = supabaseAdmin as any;
    const { error } = await sa.from("site_team").upsert(member, { onConflict: "id" });
    if (error) throw error;
    await recordAdminHistory(actor, "upserted team member", "team_member", member.id, member);
    return { ok: true };
  });

export const adminDeleteTeam = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AdminAuth.parse(input))
  .handler(async ({ data, request }: any) => {
    const { password, id } = data as any;
    const actor = await requireAdminAuth(request, password);
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
    await recordAdminHistory(actor, "deleted team member", "team_member", id, { imageUrl });
    return { ok: true };
  });
