import { z } from "zod";

export const ADMIN_SESSION_COOKIE_NAME = "tcl_admin_session";

export const AdminLogin = z.object({
  username: z.string().min(1).max(200),
  password: z.string().min(1).max(200),
});

export const AdminAuth = z.object({
  password: z.string().min(1).max(200).optional(),
});
