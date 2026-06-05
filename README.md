# MyCBCT Portal

The CBCT referral portal for 360 Visualise. Next.js 15 (App Router) + Supabase auth.

## What's in this phase (Phase 1)
- Public homepage (`/`)
- Sign-in page wired to Supabase (`/sign-in`) — password, magic link, password reset
- Protected dashboard (`/dashboard`) and referral page (`/refer`)
- Server-side route protection via `middleware.ts`
- Magic-link / reset callback (`/auth/callback`) and sign-out (`/auth/sign-out`)

## Environment variables (set these in Vercel)
| Name | Where to get it |
|------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Connect (Next.js) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Connect (Next.js) — the `sb_publishable_…` key |

`SUPABASE_SECRET_KEY` is **not** needed in Phase 1.

## Deploy
1. Push this folder to a GitHub repo.
2. Import the repo into Vercel.
3. Add the two environment variables above.
4. In Supabase → Authentication → URL Configuration, set the Site URL to your
   Vercel URL and add `https://YOUR-APP.vercel.app/auth/callback` to Redirect URLs.
5. Create a test user in Supabase → Authentication → Users, then sign in at `/sign-in`.

## Local development (optional)
```
npm install
cp .env.example .env.local   # fill in the two NEXT_PUBLIC_ values
npm run dev
```
