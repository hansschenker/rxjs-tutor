# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A domain-agnostic AI tutor web app. The bundled RxJS curriculum is the default domain, but any subject domain can be ingested via the pipeline. The app renders a three-panel UI (sidebar / reference / chat) and streams Claude responses for in-context tutoring conversations.

## Commands

```bash
# Development (runs Vite dev server + Express API server concurrently)
npm run dev

# Production build (tsc type-check + vite bundle)
npm run build

# Tests
npm run test          # run once
npm run test:watch    # watch mode

# Run a single test file
npx vitest run tests/reducer.test.ts

# AI pipeline — extract topics from markdown sources and write curriculum.json
npm run pipeline

# Seed the built-in RxJS domain data
npm run seed
```

The frontend dev server runs on `:5173` (Vite default) and proxies `/api/*` to the Express server on `:3001`. Requires `ANTHROPIC_API_KEY` in the environment for the server.

## TypeScript Configuration

Two `tsconfig` files are in play:

| Config | Covers | Module resolution |
|--------|--------|-------------------|
| `tsconfig.json` | `src/` (frontend) | `bundler` (ESNext) |
| `tsconfig.server.json` | `server/`, `scripts/`, `pipeline/` | `node16` |

**All relative imports in `server/`, `pipeline/`, and `scripts/` must use `.js` extensions** — required by Node16 ESM (`import { foo } from './bar.js'` even though the source is `.ts`).

## Architecture

### Frontend — Vanilla TypeScript SPA

No framework. The entire UI is wired via RxJS streams in `src/main.ts`.

**MVU store** (`src/mvu/`):

```
action$ (Subject<Action>)
  └─ scan(reducer, initialState)
  └─ startWith(initialState)
  └─ shareReplay(1)
  = state$
```

- `actions.ts` — exhaustive discriminated union `Action`
- `model.ts` — `AppState` interface and `initialState`
- `reducer.ts` — pure function `(state, action) => state`
- `store.ts` — `action$`, `state$`, typed `ofType` helper, and pre-derived selectors (`selectedTopic$`, `filteredTopics$`, etc.)

**Effects** (`src/effects/`):

- `chat.effects.ts` — `chatEffect$`: listens to `CHAT_MESSAGE_SENT`, uses `exhaustMap` + `withLatestFrom(state$)`, POSTs to `/api/chat`, reads the NDJSON stream, and dispatches `CHAT_CHUNK_RECEIVED` / `CHAT_RESPONSE_COMPLETE` / `CHAT_ERROR`
- `curriculum.effects.ts` — `fetchCurriculum(domain)`: one-shot fetch of `/api/domains/<domain>/curriculum` that dispatches `CURRICULUM_LOADED` or `CURRICULUM_FAILED`

**Views** (`src/views/`): Pure functions that receive state slices and do direct DOM manipulation via `innerHTML`. No virtual DOM.

**Router** (`src/router.ts`): RxJS-based — wraps `popstate` events in `route$`, parses path segments into `{ category, topic, searchQuery }`, and dispatches `TOPIC_SELECTED` / `SEARCH_CHANGED` actions. `navigateTo(category, topic)` calls `history.pushState`.

**Curriculum data** (`src/curriculum/`):

- `types.ts` — shared types: `Topic`, `Family`, `TutorConfig`, `CurriculumJson`
- `data/` — static TypeScript files for the built-in RxJS operator curriculum, one file per operator family (creation, transformation, filtering, …)
- `index.ts` — re-exports all static topics and families

### Backend — Express 5 API (`server/`)

Runs under `tsx watch` in dev, compiled to JS for production.

| Route | File | Purpose |
|-------|------|---------|
| `POST /api/chat` | `chat.ts` | Stream Claude response as NDJSON (`{ chunk: "..." }` lines) |
| `GET /api/domains` | `pipeline.ts` | List registered domains |
| `POST /api/domains` | `pipeline.ts` | Register a new domain |
| `POST /api/pipeline/upload/:domain` | `pipeline.ts` | Upload `.md`/`.txt` source files via multipart |
| `POST /api/pipeline/run/:domain` | `pipeline.ts` | Run extraction pipeline, write `curriculum.json` |
| `GET /api/domains/:domain/curriculum` | `pipeline.ts` | Serve `data/curriculum/<domain>/curriculum.json` |

`domain-store.ts` is a simple file-backed registry at `data/domains.json`. It reads and writes on every call — no in-memory cache.

### Pipeline (`pipeline/`)

Processes markdown/text source files into a structured `curriculum.json`:

```
loadSourceDocuments(sourcesDir)          # loader.ts
  → extractTopics(doc, config, client)  # extractor.ts — Claude tool_use call
  → mergeTopics(results)                # merger.ts — deduplicate by name+category
  → groupByCategory(merged)             # merger.ts
  → writeCurriculumJson(grouped, …)     # json-writer.ts → data/curriculum/<domain>/curriculum.json
```

The extractor calls Claude with a single `extract_topics` tool (forced via `tool_choice: { type: 'any' }`). Topics arrive as `RawTopic[]` and are normalised to `Topic[]` in `json-writer.ts`.

## Key Data Structures

```typescript
// src/curriculum/types.ts
Topic       — name, category, description, definition?, visual?, examples[], tags[], seeAlso[]
Family      — name, description?, topics[]
TutorConfig — domainName, systemPromptTemplate, defaultCategory, defaultTopic, labels
CurriculumJson — domain, generatedAt, topics[], families[], tutorConfig
```

`systemPromptTemplate` supports four placeholders: `{domainName}`, `{topicName}`, `{category}`, `{topicJson}`.

## File Layout

```
src/
  mvu/          actions, model, reducer, store
  effects/      chat.effects, curriculum.effects
  views/        sidebar, reference, chat
  curriculum/   types + data/<family>.ts files
  router.ts
  main.ts       wiring — subscriptions, effect hookup
server/
  index.ts      Express app
  chat.ts       /api/chat streaming endpoint
  pipeline.ts   domain CRUD + pipeline trigger endpoints
  domain-store.ts
pipeline/
  types.ts      PipelineConfig, RawTopic, ExtractionResult
  service.ts    runPipeline orchestrator
  extractor.ts  Claude tool_use extraction
  loader.ts     read source files from disk
  merger.ts     deduplicate & group topics
  json-writer.ts write curriculum.json
  run.ts        CLI entry point
data/
  domains.json            domain registry
  curriculum/<domain>/    curriculum.json per domain
tests/
  reducer.test.ts
  store.test.ts
  router.test.ts
  pipeline/               extractor, merger, json-writer, service tests
  server/                 domain-store tests
```
