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

Apply `supabase/migrations/202611180001_profiles_and_reactions.sql` and `supabase/migrations/202611190001_feedback.sql` in the Supabase SQL editor. In Supabase Auth settings, enable anonymous sign-ins to let users enter with only a name. Add the local and production app redirects (including `/#/` and `/#/reset-password`) to the redirect allow list. Name-only access is an anonymous Supabase account saved on that device; signing out or clearing browser data loses access to that identity. Supabase recommends CAPTCHA protection for anonymous sign-ins.

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

Also allow the deployed domain in Supabase Auth's site URL and redirect URL allow list. The Vercel function returns a clear setup error until `AI_API_KEY` is set. Chat requests are sent to the hosted provider from the server function; the key is never exposed to the browser.

## Privacy and data

Supabase Auth manages accounts and sessions. A database trigger maintains the profile row. The `reactions` table has a unique `(user_id, content_id)` constraint and row-level policies so users can only read or modify their own reaction. Diary entries, tasks and audio stay in the current browser and do not sync between devices; local records and audio storage are scoped to the authenticated user on that browser. Chat messages are sent to the configured AI provider for processing.

## Validation

```bash
npm run lint
npm run typecheck
npm run build
```

## Configuração da IA hospedada (Vercel)

A rota `api/chat.ts` usa o formato OpenAI Chat Completions e aceita provedores compatíveis. Configure no ambiente **Production** da Vercel:

- `AI_API_KEY`: chave privada fornecida pelo serviço de IA.
- `AI_BASE_URL`: URL HTTPS base do endpoint compatível, terminando normalmente em `/v1` (ex.: `https://api.exemplo.com/v1`).
- `AI_MODEL`: identificador exato de um modelo habilitado na conta do provedor.

Não use prefixo `VITE_` nessas variáveis. Não coloque chaves em arquivos do frontend, no GitHub ou em mensagens. Depois de alterar variáveis, faça um novo deployment para que elas entrem em vigor.

O projeto não inclui uma chave nem uma cota de IA. A resposta real depende de uma conta/provedor autorizado, de uma chave válida, de um modelo disponível e dos limites do serviço. A aplicação não inventa respostas quando o provedor está indisponível: ela retorna uma mensagem de erro clara.

