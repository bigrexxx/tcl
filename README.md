# TCL Babcock Hub

The official web platform for **The Campus Lifestyle** at Babcock University — membership applications, Studios 25 bookings, and an admin dashboard.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [TanStack Start](https://tanstack.com/start) (SSR React) |
| Routing | TanStack Router (file-based) |
| Database / Auth | [Supabase](https://supabase.com) |
| Styling | Tailwind CSS v4 + Radix UI (shadcn/ui) |
| Email | [Resend](https://resend.com) |
| Deployment | Cloudflare Workers via Wrangler |

---

## Getting Started

### 1. Install dependencies

```bash
bun install
# or: npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Fill in `.env` with your real values — see `.env.example` for all required keys.

### 3. Run the Supabase migrations

In your [Supabase dashboard](https://supabase.com/dashboard) → SQL Editor, run all files in `supabase/migrations/` in order.

### 4. Start the dev server

```bash
bun dev
# or: npm run dev
```

The app runs at `http://localhost:3000`.

---

## Environment Variables

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key |
| `VITE_SUPABASE_URL` | Same as above (exposed to browser) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Same as above (exposed to browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key — **never expose client-side** |
| `ADMIN_PASSWORD` | Password for the `/admin` dashboard |
| `RESEND_API_KEY` | Resend API key for transactional emails |
| `EMAIL_FROM` | Sender address, e.g. `TCL Babcock <no-reply@yourdomain.com>` |

---

## Deploying to Cloudflare Workers

### First deploy

```bash
# Authenticate with Cloudflare
bunx wrangler login

# Add secrets (never put these in wrangler.jsonc)
bunx wrangler secret put RESEND_API_KEY
bunx wrangler secret put ADMIN_PASSWORD
bunx wrangler secret put SUPABASE_SERVICE_ROLE_KEY

# Build and deploy
bun run build
bunx wrangler deploy
```

### Subsequent deploys

```bash
bun run build && bunx wrangler deploy
```

---

## Project Structure

```
src/
├── routes/
│   ├── index.tsx          # Landing page
│   ├── register.tsx       # Membership application form
│   ├── studio.tsx         # Studios 25 booking page
│   ├── status.tsx         # Applicant status portal
│   ├── admin.tsx          # Admin dashboard (password-protected)
│   ├── committees.$id.tsx # Individual committee pages
│   └── __root.tsx         # Root layout + Google Analytics
├── lib/
│   ├── tcl-admin.functions.ts   # Admin server functions
│   ├── tcl-backend.functions.ts # Public server functions
│   ├── tcl-email.ts             # All email templates + send helper
│   ├── tcl-config.ts            # Settings hook + formatNaira
│   └── tcl-committees.ts        # Committee definitions + questions
├── integrations/supabase/
│   ├── client.ts          # Browser Supabase client (anon key)
│   ├── client.server.ts   # Server Supabase client (service role key)
│   └── types.ts           # Auto-generated DB types
└── components/
    ├── TclNav.tsx          # Nav bar + footer
    └── LandingEnhancements.tsx
supabase/
└── migrations/            # Run these in order in Supabase SQL editor
```

---

## Keeping generated files up to date

### Route tree (`src/routeTree.gen.ts`)
Regenerated automatically every time you run `bun dev` or `bun run build`. Do not edit it manually and do not commit it — it's in `.gitignore`.

### Database types (`src/integrations/supabase/types.ts`)
After running a new Supabase migration, regenerate this file so TypeScript knows about your schema changes:

```bash
bunx supabase gen types typescript \
  --project-id your-project-id \
  --schema public \
  > src/integrations/supabase/types.ts
```

Replace `your-project-id` with the ID from your Supabase dashboard URL (`https://supabase.com/dashboard/project/<id>`). You can also find it in your `.env` as `VITE_SUPABASE_PROJECT_ID` if set.

---

All transactional emails are sent via [Resend](https://resend.com). You must:

1. Create a Resend account and verify your sending domain
2. Set `RESEND_API_KEY` and `EMAIL_FROM` in your environment
3. Set the WhatsApp group link in **Admin → Settings** (required for approval emails)

Emails sent automatically:
- **Application approved** — includes WhatsApp community group link
- **Application declined** — polite rejection with encouragement to reapply
- **Studio booking confirmed** — session details + WhatsApp contact button
- **Studio booking declined** — prompts client to rebook

---

## Admin Dashboard

Access at `/admin`. Protected by `ADMIN_PASSWORD` environment variable.

Features:
- Dashboard with live application + booking counts and activity feed
- Applications panel — approve/decline with automatic email
- Members panel — all approved members
- Bookings panel — confirm/decline studio sessions with automatic email
- Settings panel — edit pricing, WhatsApp numbers, GA ID
