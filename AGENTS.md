# Mindly Project Instructions

## Project context

Mindly is a React 18 application built with Vite. Structured data and recordings remain browser-local. Optional AI features use the separate Node API in `backend/server.js`, which forwards requests to an operator-configured Ollama server.

## Local development

Read `README.md` for setup, backend configuration, and validation commands. Start the API and Vite in separate terminals:

```bash
npm run backend:dev
npm run dev
```

## Data and integrations

- Reuse `src/api/localData.js` for structured browser-local data.
- Reuse `src/api/localFiles.js` for audio blobs in IndexedDB.
- Frontend AI requests go to `/api`; Vite forwards them to the local Node API during development.
- Configure Ollama only through backend environment variables such as `OLLAMA_BASE_URL` and `OLLAMA_MODEL`.
- Do not expose Ollama addresses, credentials, or server secrets in `VITE_*` variables or frontend code.
- Do not add third-party hosted AI credentials or replace Ollama without explicit direction.
- Never store secrets in source or commit local environment files.