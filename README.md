# AXIO-GPT

A minimal ChatGPT-style UI powered by OpenAI Responses API.

## Setup

1) Create `.env.local` with:
```
OPENAI_API_KEY=sk-...
OPENAI_ORG=org_...
OPENAI_PROJECT=proj_...
OPENAI_MODEL=gpt-4.1-mini
OPENAI_INSTRUCTIONS=You are a helpful assistant.
NEXT_PUBLIC_APP_NAME=AXIO-GPT
```

2) Install and run:
```
npm install
npm run dev
```
Open http://localhost:3000

## Notes
- Server streams via `/api/chat` using `openai.responses.stream`.
- Client tracks `X-Response-Id` for multi-turn continuity using `previous_response_id`.
