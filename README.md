# Mindly

Mindly is a React 18 + Vite application. Diary entries, tasks and recordings remain in the browser. Accounts and emoji reactions use Supabase. Chat uses an OpenAI-compatible hosted provider in production; local development can use the same provider or the existing Ollama backend.

## Setup

Requirements: Node.js 20+ and npm.

```bash
npm install
cp .env.example .env
cp backend/.env.example backend/.env
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`. The publishable/anon key is intended for browser use; database access is restricted with RLS. Never put a service-role key in frontend variables.

Apply `supabase/migrations/202611180001_profiles_and_reactions.sql` in the Supabase SQL editor. In Supabase Auth settings, enable email confirmations, Google and Facebook OAuth, and an SMS provider. Add the local and production app redirects (including `/#/` and `/#/reset-password`) to Supabase's redirect allow list. In Google and Facebook developer settings, register Supabase's callback URL, `https://<project-ref>.supabase.co/auth/v1/callback`; then enter the Google OAuth Client ID/Secret and Facebook App ID/Secret in the matching Supabase provider settings. Facebook needs `public_profile` and `email` permissions. Configure SMS provider credentials under Supabase Auth > Phone. Provider callbacks and app redirects are separate settings.

For chat, configure a hosted OpenAI-compatible API. To use it locally, add `AI_API_KEY`, `AI_BASE_URL` (defaults to `https://api.openai.com/v1`) and `AI_MODEL` (defaults to `gpt-4o-mini`) to `backend/.env`, then run:

```bash
npm run backend:dev
npm run dev
```

If no hosted key is set in `backend/.env`, the local backend uses Ollama at `OLLAMA_BASE_URL` (default `http://127.0.0.1:11434`) and `OLLAMA_MODEL` (default `llama3.2:3b`). Ollama is only a local development option. The Vercel function never calls localhost.

## Vercel deployment

Import the GitHub repository into Vercel. `vercel.json` builds Vite to `dist` and maps `/api/chat` and `/api/health` to their serverless handlers. Set these project environment variables for Production and Preview as needed:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `AI_API_KEY` (required for chat)
- `AI_BASE_URL` (optional; OpenAI-compatible HTTPS base URL)
- `AI_MODEL` (optional; defaults to `gpt-4o-mini`)

Also allow the deployed domain in Supabase Auth's site URL, redirect URL allow list and OAuth provider configuration. The Vercel function returns a clear setup error until `AI_API_KEY` is set. Chat requests are sent to the hosted provider from the server function; the key is never exposed to the browser.

## Privacy and data

Supabase Auth manages accounts and sessions. A database trigger maintains the profile row. The `reactions` table has a unique `(user_id, content_id)` constraint and row-level policies so users can only read or modify their own reaction. Diary entries, tasks and audio stay in the current browser and do not sync between devices; local records and audio storage are scoped to the authenticated user on that browser. Chat messages are sent to the configured AI provider for processing.

## Validation

```bash
npm run lint
npm run typecheck
npm run build
```
