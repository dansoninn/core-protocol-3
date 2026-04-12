## Project
CP.v02 (Core Protocol) - Next.js e-learning platform
All app code is in /web directory

## Before Every Commit
- Always run `cd web && npm run build` before committing
- Fix ALL TypeScript and ESLint errors before pushing
- Never push code that fails to build locally

## Stack
- Next.js App Router (v14)
- Supabase (@supabase/ssr) for auth and database
- TypeScript, Tailwind CSS
- Deployed on Vercel via GitHub (main branch)

## Supabase
- Server components: use @/lib/supabase/server
- Client components: use @/lib/supabase/client
- Never use mock/hardcoded data - always read from Supabase

## Architecture
- /dashboard - authenticated users only (middleware protected)
- /admin - admin role only (middleware + server-side check)
- Server components for all data fetching
- Client components only for interactivity

## Do Not Touch
- web/middleware.ts - do not modify
