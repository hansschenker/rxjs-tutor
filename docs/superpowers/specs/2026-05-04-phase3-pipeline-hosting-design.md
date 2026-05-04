# Phase 3: Source Upload + Pipeline Hosting — Design Spec

**Date:** 2026-05-04
**Status:** Approved

## Goal

Convert the local CLI pipeline into a hosted HTTP service. Domain experts upload Markdown source files via API, trigger the Claude extraction pipeline, and the tutor SPA fetches the generated curriculum at runtime instead of importing it statically at build time.

---

## Architecture

### Server Restructure

`server/chat.ts` currently boots Express itself. It becomes a router export. A new `server/index.ts` mounts both routers on a shared app running on port 3001.

```
server/
  index.ts       ← new: app setup, mounts routers, starts on :3001
  chat.ts        ← modified: exports chatRouter instead of booting Express
  pipeline.ts    ← new: pipelineRouter (5 endpoints)
```

### Pipeline Extraction

`pipeline/run.ts` is currently a CLI script. The core orchestration logic is extracted into an exported async function:

```typescript
interface PipelineRunResult {
  topicCount:  number
  familyCount: number
  durationMs:  number
}

export async function runPipeline(
  config:     PipelineConfig,
  sourcesDir: string,
  client:     Anthropic,
): Promise<PipelineRunResult>
```

The CLI wrapper calls this function. `server/pipeline.ts` also calls it directly. The writer is updated to output `curriculum.json` (JSON) instead of TypeScript files when invoked from the server.

### Runtime Storage

```
data/
  domains.json                         ← domain registry
  sources/<domain>/*.md                ← uploaded source files
  curriculum/<domain>/curriculum.json  ← pipeline output (JSON)
```

`data/` sits alongside `src/` and `server/`, added to `.gitignore`. The existing `pipeline/domains/typescript/` is untouched — it remains the CLI workflow's source directory.

---

## API Surface

All endpoints are mounted under `pipelineRouter` at the `/api` prefix.

### Register a domain

```
POST /api/domains
Content-Type: application/json

{ "id": "typescript", "name": "TypeScript", "description": "TypeScript language features and type system" }
```

- **201** `{ domain: Domain }` on success
- **409** `{ error: "domain already exists" }` if `id` is taken

### List domains

```
GET /api/domains
```

- **200** `{ domains: Domain[] }`

### Upload source files

```
POST /api/pipeline/upload/:domain
Content-Type: multipart/form-data

field: "sources"  (one or more .md files)
```

- **200** `{ uploaded: string[] }` — list of saved filenames
- **404** if domain not registered

### Run pipeline

```
POST /api/pipeline/run/:domain
Content-Type: application/json

{ "model": "claude-opus-4-7" }  ← optional, defaults to domain config
```

- **200** `{ topicCount: number, familyCount: number, durationMs: number }`
- **400** `{ error: "no source files found" }` if `data/sources/<domain>/` is empty
- **404** if domain not registered
- **500** `{ error: string }` if Claude API or pipeline fails

### Serve curriculum

```
GET /api/domains/:domain/curriculum
```

- **200** `CurriculumJson` — full topic + family data
- **404** if pipeline has not been run yet for this domain

---

## Data Shapes

### Domain registry (`data/domains.json`)

```json
{
  "domains": [
    {
      "id": "typescript",
      "name": "TypeScript",
      "description": "TypeScript language features and type system",
      "createdAt": "2026-05-04T10:00:00Z",
      "lastRun": "2026-05-04T10:05:00Z",
      "topicCount": 16
    }
  ]
}
```

### Curriculum JSON (`data/curriculum/<domain>/curriculum.json`)

```json
{
  "domain": "typescript",
  "generatedAt": "2026-05-04T10:05:00Z",
  "topics": [
    {
      "id": "generic-functions",
      "name": "Generic Functions",
      "category": "Generics",
      "description": "...",
      "definition": "...",
      "visual": "...",
      "examples": [{ "title": "...", "content": "..." }],
      "tags": ["generics", "functions"],
      "seeAlso": ["Generic Constraints"]
    }
  ],
  "families": [
    {
      "id": "generics",
      "label": "Generics",
      "topics": ["generic-functions", "generic-constraints"]
    }
  ]
}
```

---

## Data Flow

### Register domain
`POST /api/domains` → read `data/domains.json` (create if missing) → append entry → write back → return domain.

### Upload sources
`POST /api/pipeline/upload/:domain` → verify domain exists in registry → save each `.md` to `data/sources/<domain>/` (overwrite on name collision) → return filenames.

### Run pipeline
`POST /api/pipeline/run/:domain` →
1. Load domain from registry → build `PipelineConfig`
2. Read all `.md` files from `data/sources/<domain>/`
3. Call `runPipeline(config, sourcesDir, anthropicClient)`
4. Extraction + merger runs as today (same Claude tool_use logic)
5. Writer outputs `data/curriculum/<domain>/curriculum.json`
6. Update `lastRun` + `topicCount` in `data/domains.json`
7. Return `{ topicCount, familyCount, durationMs }`

### Serve curriculum
`GET /api/domains/:domain/curriculum` → read `data/curriculum/<domain>/curriculum.json` → return as JSON. 404 if file does not exist.

---

## Frontend Change

`src/curriculum/` currently imports TS files statically at build time. Phase 3 introduces a `fetchCurriculum(domain: string): Observable<TutorConfig>` that calls `GET /api/domains/:domain/curriculum`.

The MVU store dispatches a `curriculumLoaded(config: TutorConfig)` action on success and `curriculumFailed(error: string)` on error. The initial state becomes `{ status: 'loading' }` until the fetch resolves, replacing today's hard-coded import.

---

## Error Handling

| Scenario | Response |
|---|---|
| Domain ID already exists | 409 `{ error: "domain already exists" }` |
| Upload to unregistered domain | 404 |
| Run with no source files | 400 `{ error: "no source files found" }` |
| Claude API error | 500 `{ error: message }` |
| Curriculum requested before pipeline run | 404 |
| Malformed `data/domains.json` | 500 — server logs parse error |

No retry logic or partial-success handling. If the pipeline fails mid-run, the curriculum file is not written and `lastRun` is not updated. The client re-runs.

---

## Out of Scope (Phase 3)

- Frontend UI (Phase 4: creator dashboard)
- Authentication (Phase 4)
- Async jobs / progress streaming (not needed for synchronous runs)
- Cloud storage (Phase 5)
- Multiple pipeline run history per domain
