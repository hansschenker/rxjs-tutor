# Phase 3: Source Upload + Pipeline Hosting — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the local CLI pipeline into a hosted HTTP service with a domain registry, file upload, and runtime curriculum delivery to the SPA.

**Architecture:** Restructure the Express server into a shared `server/index.ts` that mounts `chatRouter` and `pipelineRouter`. Extract pipeline orchestration into `pipeline/service.ts`. The SPA fetches curriculum dynamically via `src/effects/curriculum.effects.ts` instead of importing TypeScript files at build time.

**Tech Stack:** Express 5, multer (multipart upload), Vitest, RxJS effects, tsx

---

## File Map

**Create:**
- `pipeline/service.ts` — `runPipeline()` extracting orchestration from CLI
- `pipeline/json-writer.ts` — `writeCurriculumJson()` writing `curriculum.json`
- `server/domain-store.ts` — domain registry CRUD on `data/domains.json`
- `server/pipeline.ts` — Express router for 5 pipeline API endpoints
- `server/index.ts` — Express entry point mounting chat + pipeline routers
- `scripts/seed-rxjs-domain.ts` — seeds `data/` from existing static RxJS data
- `src/effects/curriculum.effects.ts` — Observable that fetches curriculum from API
- `tests/pipeline/service.test.ts`
- `tests/pipeline/json-writer.test.ts`
- `tests/server/domain-store.test.ts`

**Modify:**
- `pipeline/run.ts` — use `runPipeline()` from service.ts
- `server/chat.ts` — export `chatRouter` instead of booting Express
- `src/curriculum/types.ts` — add `CurriculumJson`
- `src/mvu/actions.ts` — add `CURRICULUM_LOADED`, `CURRICULUM_FAILED`
- `src/mvu/model.ts` — add curriculum fields to `AppState`
- `src/mvu/reducer.ts` — handle curriculum actions
- `src/mvu/store.ts` — `filteredTopics$` from state, add `families$`, `tutorConfig$`, `curriculumStatus$`
- `src/effects/chat.effects.ts` — read config from state instead of static import
- `src/views/sidebar.ts` — accept `families` as parameter (remove static import)
- `src/router.ts` — accept `topics` as second parameter in `initRouter`
- `src/main.ts` — fetch curriculum on start, handle loading/error state
- `index.html` — add `#loading` overlay
- `package.json` — update `dev` script to `tsx watch server/index.ts`
- `.gitignore` — add `data/`

---

### Task 1: Setup — multer, .gitignore, CurriculumJson type

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`
- Modify: `src/curriculum/types.ts`

- [ ] **Step 1: Install multer**

```bash
npm install multer
npm install --save-dev @types/multer
```

- [ ] **Step 2: Update .gitignore**

Add this line to `.gitignore`:
```
data/
```

- [ ] **Step 3: Update dev script in package.json**

In `package.json`, change the `dev` script from:
```json
"dev": "concurrently \"vite\" \"tsx watch server/chat.ts\""
```
to:
```json
"dev": "concurrently \"vite\" \"tsx watch server/index.ts\""
```

- [ ] **Step 4: Add CurriculumJson to src/curriculum/types.ts**

Append to the end of `src/curriculum/types.ts`:
```typescript
export interface CurriculumJson {
	domain:      string
	generatedAt: string
	topics:      Topic[]
	families:    Family[]
	tutorConfig: TutorConfig
}
```

- [ ] **Step 5: Type-check frontend**

```bash
npx tsc -p tsconfig.json --noEmit
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json .gitignore src/curriculum/types.ts
git commit -m "feat: install multer, add CurriculumJson type, update dev script"
```

---

### Task 2: Create pipeline/service.ts

**Files:**
- Create: `pipeline/service.ts`
- Modify: `pipeline/run.ts`
- Create: `tests/pipeline/service.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/pipeline/service.test.ts`:
```typescript
// tests/pipeline/service.test.ts
import { describe, test, expect, vi, beforeEach } from 'vitest'
import type { PipelineConfig } from '../../pipeline/types'
import type Anthropic from '@anthropic-ai/sdk'

vi.mock('../../pipeline/loader', () => ({
	loadSourceDocuments: vi.fn().mockReturnValue([
		{ filename: 'test.md', content: '# Test' },
	]),
}))

vi.mock('../../pipeline/extractor', () => ({
	extractTopics: vi.fn().mockResolvedValue({
		sourceFile: 'test.md',
		topics: [{
			name:        'Partial',
			category:    'Utility Types',
			description: 'Makes all properties optional',
			definition:  'Partial<T>',
			visual:      '',
			examples:    [{ title: 'Basic', content: 'Partial<User>' }],
			tags:        ['utility'],
			seeAlso:     ['Required'],
		}],
	}),
}))

const mockConfig: PipelineConfig = {
	domain: {
		name:            'TypeScript',
		description:     'TypeScript language features',
		defaultCategory: 'Utility Types',
		defaultTopic:    'Partial',
		labels:          { category: 'Category', topic: 'Topic' },
	},
	extraction: { model: 'claude-haiku-4-5-20251001', maxChunkChars: 1000 },
	output:     { dir: 'test-output' },
}

const mockClient = {} as Anthropic

describe('runPipeline', () => {
	beforeEach(() => vi.clearAllMocks())

	test('returns grouped topics by category', async () => {
		const { runPipeline } = await import('../../pipeline/service')
		const result = await runPipeline(mockConfig, '/fake/sources', mockClient)
		expect(result.grouped.get('Utility Types')).toHaveLength(1)
		expect(result.grouped.get('Utility Types')![0].name).toBe('Partial')
	})

	test('returns tutorConfig built from domain config', async () => {
		const { runPipeline } = await import('../../pipeline/service')
		const result = await runPipeline(mockConfig, '/fake/sources', mockClient)
		expect(result.tutorConfig.domainName).toBe('TypeScript')
	})

	test('calls loadSourceDocuments with the provided sourcesDir', async () => {
		const { loadSourceDocuments } = await import('../../pipeline/loader')
		const { runPipeline }         = await import('../../pipeline/service')
		await runPipeline(mockConfig, '/specific/path', mockClient)
		expect(loadSourceDocuments).toHaveBeenCalledWith('/specific/path')
	})

	test('calls extractTopics once per source document', async () => {
		const { extractTopics } = await import('../../pipeline/extractor')
		const { runPipeline }   = await import('../../pipeline/service')
		await runPipeline(mockConfig, '/fake/sources', mockClient)
		expect(extractTopics).toHaveBeenCalledTimes(1)
	})
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/pipeline/service.test.ts
```
Expected: FAIL — `../../pipeline/service` module not found.

- [ ] **Step 3: Create pipeline/service.ts**

```typescript
// pipeline/service.ts

import Anthropic from '@anthropic-ai/sdk'
import { loadSourceDocuments }       from './loader.js'
import { extractTopics }             from './extractor.js'
import { mergeTopics, groupByCategory } from './merger.js'
import { buildTutorConfig }          from './types.js'
import type { PipelineConfig, RawTopic } from './types.js'
import type { TutorConfig }          from '../src/curriculum/types.js'

export interface PipelineResult {
	grouped:     Map<string, RawTopic[]>
	tutorConfig: TutorConfig
}

export async function runPipeline(
	config:     PipelineConfig,
	sourcesDir: string,
	client:     Anthropic,
): Promise<PipelineResult> {
	const docs    = loadSourceDocuments(sourcesDir)
	const results = []
	for (const doc of docs) {
		const result = await extractTopics(doc, config, client)
		results.push(result)
	}
	const merged  = mergeTopics(results)
	const grouped = groupByCategory(merged)
	return { grouped, tutorConfig: buildTutorConfig(config) }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/pipeline/service.test.ts
```
Expected: PASS (4 tests).

- [ ] **Step 5: Update pipeline/run.ts to use service.ts**

Replace the full content of `pipeline/run.ts`:
```typescript
// pipeline/run.ts

import Anthropic from '@anthropic-ai/sdk'
import { readFileSync } from 'fs'
import { join, resolve } from 'path'
import { writeOutput } from './writer.js'
import { runPipeline } from './service.js'
import type { PipelineConfig } from './types.js'

async function run(): Promise<void> {
	const [, , configPath] = process.argv
	if (!configPath) {
		console.error('Usage: tsx pipeline/run.ts <path/to/config.json>')
		process.exit(1)
	}

	const config: PipelineConfig = JSON.parse(
		readFileSync(resolve(configPath), 'utf-8')
	)

	const sourcesDir = join(resolve(configPath), '..', 'sources')

	const apiKey = process.env['ANTHROPIC_API_KEY']
	if (!apiKey) {
		console.error('ANTHROPIC_API_KEY environment variable is not set')
		process.exit(1)
	}
	const client = new Anthropic({ apiKey })

	console.log(`Running pipeline for domain: ${config.domain.name}`)
	const result    = await runPipeline(config, sourcesDir, client)
	const outputDir = resolve(config.output.dir)

	writeOutput(result.grouped, result.tutorConfig, outputDir)
	console.log('Done.')
}

run().catch(err => {
	console.error(err)
	process.exit(1)
})
```

- [ ] **Step 6: Type-check server code**

```bash
npx tsc -p tsconfig.server.json --noEmit
```
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add pipeline/service.ts pipeline/run.ts tests/pipeline/service.test.ts
git commit -m "feat: extract runPipeline into pipeline/service.ts"
```

---

### Task 3: Create pipeline/json-writer.ts

**Files:**
- Create: `pipeline/json-writer.ts`
- Create: `tests/pipeline/json-writer.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/pipeline/json-writer.test.ts`:
```typescript
// tests/pipeline/json-writer.test.ts
import { describe, test, expect, afterEach } from 'vitest'
import { mkdtempSync, rmSync, readFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { writeCurriculumJson } from '../../pipeline/json-writer'
import type { RawTopic }    from '../../pipeline/types'
import type { TutorConfig } from '../../src/curriculum/types'

const mockTutor: TutorConfig = {
	domainName:           'TypeScript',
	systemPromptTemplate: 'You are a {domainName} tutor.',
	defaultCategory:      'Utility Types',
	defaultTopic:         'Partial',
	labels:               { category: 'Category', topic: 'Topic' },
}

const mockGrouped = new Map<string, RawTopic[]>([
	['Utility Types', [{
		name:        'Partial',
		category:    'Utility Types',
		description: 'Makes all properties optional',
		definition:  'Partial<T>',
		visual:      '',
		examples:    [{ title: 'Basic', content: 'Partial<User>' }],
		tags:        ['utility'],
		seeAlso:     ['Required'],
	}]],
])

let tmpDir = ''

afterEach(() => {
	if (tmpDir) rmSync(tmpDir, { recursive: true, force: true })
})

describe('writeCurriculumJson', () => {
	test('writes curriculum.json with correct top-level fields', () => {
		tmpDir       = mkdtempSync(join(tmpdir(), 'json-writer-test-'))
		writeCurriculumJson(mockGrouped, mockTutor, 'typescript', tmpDir)
		const parsed = JSON.parse(readFileSync(join(tmpDir, 'curriculum.json'), 'utf-8'))
		expect(parsed.domain).toBe('typescript')
		expect(typeof parsed.generatedAt).toBe('string')
		expect(parsed.tutorConfig.domainName).toBe('TypeScript')
	})

	test('topics array contains mapped topic objects', () => {
		tmpDir       = mkdtempSync(join(tmpdir(), 'json-writer-test-'))
		writeCurriculumJson(mockGrouped, mockTutor, 'typescript', tmpDir)
		const parsed = JSON.parse(readFileSync(join(tmpDir, 'curriculum.json'), 'utf-8'))
		expect(parsed.topics).toHaveLength(1)
		expect(parsed.topics[0].name).toBe('Partial')
		expect(parsed.topics[0].examples[0].title).toBe('Basic')
	})

	test('families array groups topics by category', () => {
		tmpDir       = mkdtempSync(join(tmpdir(), 'json-writer-test-'))
		writeCurriculumJson(mockGrouped, mockTutor, 'typescript', tmpDir)
		const parsed = JSON.parse(readFileSync(join(tmpDir, 'curriculum.json'), 'utf-8'))
		expect(parsed.families).toHaveLength(1)
		expect(parsed.families[0].name).toBe('Utility Types')
		expect(parsed.families[0].topics).toHaveLength(1)
	})

	test('returns correct topicCount and familyCount', () => {
		tmpDir        = mkdtempSync(join(tmpdir(), 'json-writer-test-'))
		const stats   = writeCurriculumJson(mockGrouped, mockTutor, 'typescript', tmpDir)
		expect(stats.topicCount).toBe(1)
		expect(stats.familyCount).toBe(1)
	})

	test('creates outputDir if it does not exist', () => {
		tmpDir        = mkdtempSync(join(tmpdir(), 'json-writer-test-'))
		const nested  = join(tmpDir, 'deeply', 'nested')
		writeCurriculumJson(mockGrouped, mockTutor, 'typescript', nested)
		expect(() => readFileSync(join(nested, 'curriculum.json'), 'utf-8')).not.toThrow()
	})
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/pipeline/json-writer.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Create pipeline/json-writer.ts**

```typescript
// pipeline/json-writer.ts

import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { RawTopic } from './types.js'
import type { Topic, Family, TutorConfig, CurriculumJson } from '../src/curriculum/types.js'

function rawToTopic(raw: RawTopic): Topic {
	return {
		name:        raw.name,
		category:    raw.category,
		description: raw.description,
		definition:  raw.definition,
		visual:      raw.visual,
		examples:    raw.examples ?? [],
		tags:        raw.tags     ?? [],
		seeAlso:     raw.seeAlso  ?? [],
	}
}

export function writeCurriculumJson(
	grouped:     Map<string, RawTopic[]>,
	tutorConfig: TutorConfig,
	domain:      string,
	outputDir:   string,
): { topicCount: number; familyCount: number } {
	mkdirSync(outputDir, { recursive: true })

	const topics: Topic[]    = []
	const families: Family[] = []

	for (const [category, rawTopics] of grouped) {
		const categoryTopics = rawTopics.map(rawToTopic)
		topics.push(...categoryTopics)
		families.push({ name: category, description: '', topics: categoryTopics })
	}

	const curriculum: CurriculumJson = {
		domain,
		generatedAt: new Date().toISOString(),
		topics,
		families,
		tutorConfig,
	}

	writeFileSync(
		join(outputDir, 'curriculum.json'),
		JSON.stringify(curriculum, null, 2),
		'utf-8',
	)

	return { topicCount: topics.length, familyCount: families.length }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/pipeline/json-writer.test.ts
```
Expected: PASS (5 tests).

- [ ] **Step 5: Run all tests**

```bash
npx vitest run
```
Expected: all existing tests + 4 (service) + 5 (json-writer) = 36 tests pass.

- [ ] **Step 6: Commit**

```bash
git add pipeline/json-writer.ts tests/pipeline/json-writer.test.ts
git commit -m "feat: add JSON curriculum writer for server pipeline output"
```

---

### Task 4: Create server/domain-store.ts

**Files:**
- Create: `server/domain-store.ts`
- Create: `tests/server/domain-store.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/server/domain-store.test.ts`:
```typescript
// tests/server/domain-store.test.ts
import { describe, test, expect, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { createDomainStore } from '../../server/domain-store'

let tmpDir = ''

afterEach(() => {
	if (tmpDir) rmSync(tmpDir, { recursive: true, force: true })
})

function makeStore() {
	tmpDir = mkdtempSync(join(tmpdir(), 'domain-store-test-'))
	return createDomainStore(tmpDir)
}

const baseDomain = {
	id:          'typescript',
	name:        'TypeScript',
	description: 'TypeScript language',
	createdAt:   '2026-05-04T00:00:00Z',
	lastRun:     null as string | null,
	topicCount:  null as number | null,
}

describe('createDomainStore', () => {
	test('getDomains returns empty array when registry does not exist', () => {
		const store = makeStore()
		expect(store.getDomains()).toEqual([])
	})

	test('addDomain persists a domain', () => {
		const store = makeStore()
		store.addDomain(baseDomain)
		expect(store.getDomains()).toHaveLength(1)
		expect(store.getDomains()[0]!.id).toBe('typescript')
	})

	test('getDomain returns domain by id', () => {
		const store = makeStore()
		store.addDomain(baseDomain)
		expect(store.getDomain('typescript')?.name).toBe('TypeScript')
	})

	test('getDomain returns undefined for unknown id', () => {
		const store = makeStore()
		expect(store.getDomain('unknown')).toBeUndefined()
	})

	test('updateDomain patches existing domain', () => {
		const store = makeStore()
		store.addDomain(baseDomain)
		store.updateDomain('typescript', { topicCount: 16, lastRun: '2026-05-04T10:00:00Z' })
		const updated = store.getDomain('typescript')!
		expect(updated.topicCount).toBe(16)
		expect(updated.lastRun).toBe('2026-05-04T10:00:00Z')
	})

	test('updateDomain throws for unknown id', () => {
		const store = makeStore()
		expect(() => store.updateDomain('unknown', {})).toThrow('Domain not found: unknown')
	})

	test('data persists across separate store instances pointing at same directory', () => {
		const store1 = makeStore()
		store1.addDomain(baseDomain)
		const store2 = createDomainStore(tmpDir)
		expect(store2.getDomains()).toHaveLength(1)
	})
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/server/domain-store.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Create server/domain-store.ts**

```typescript
// server/domain-store.ts

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

export interface Domain {
	id:          string
	name:        string
	description: string
	createdAt:   string
	lastRun:     string | null
	topicCount:  number | null
}

interface DomainRegistry {
	domains: Domain[]
}

export function createDomainStore(dataDir: string) {
	const registryPath = join(dataDir, 'domains.json')

	function readRegistry(): DomainRegistry {
		if (!existsSync(registryPath)) return { domains: [] }
		return JSON.parse(readFileSync(registryPath, 'utf-8')) as DomainRegistry
	}

	function writeRegistry(registry: DomainRegistry): void {
		mkdirSync(dataDir, { recursive: true })
		writeFileSync(registryPath, JSON.stringify(registry, null, 2), 'utf-8')
	}

	return {
		getDomains(): Domain[] {
			return readRegistry().domains
		},

		getDomain(id: string): Domain | undefined {
			return readRegistry().domains.find(d => d.id === id)
		},

		addDomain(domain: Domain): void {
			const registry = readRegistry()
			registry.domains.push(domain)
			writeRegistry(registry)
		},

		updateDomain(id: string, patch: Partial<Domain>): void {
			const registry = readRegistry()
			const idx      = registry.domains.findIndex(d => d.id === id)
			if (idx === -1) throw new Error(`Domain not found: ${id}`)
			registry.domains[idx] = { ...registry.domains[idx]!, ...patch }
			writeRegistry(registry)
		},
	}
}

export const domainStore = createDomainStore(join(process.cwd(), 'data'))
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/server/domain-store.test.ts
```
Expected: PASS (7 tests).

- [ ] **Step 5: Run all tests**

```bash
npx vitest run
```
Expected: 36 + 7 = 43 tests pass.

- [ ] **Step 6: Commit**

```bash
git add server/domain-store.ts tests/server/domain-store.test.ts
git commit -m "feat: add domain registry store with CRUD operations"
```

---

### Task 5: Refactor server/chat.ts + create server/index.ts

**Files:**
- Modify: `server/chat.ts`
- Create: `server/index.ts`

- [ ] **Step 1: Replace server/chat.ts with router export**

```typescript
// server/chat.ts
import { Router } from 'express'
import Anthropic from '@anthropic-ai/sdk'
import type { Topic } from '../src/curriculum/types.js'

interface ChatRequest {
	topic:   Topic
	history: Array<{ role: 'user' | 'assistant'; content: string }>
	message: string
	config: {
		domainName:           string
		systemPromptTemplate: string
	}
}

const client = new Anthropic({ apiKey: process.env['ANTHROPIC_API_KEY'] })

function buildSystemPrompt(template: string, topic: Topic, domainName: string): string {
	return template
		.replace('{domainName}', domainName)
		.replace('{topicName}',  topic.name)
		.replace('{category}',   topic.category)
		.replace('{topicJson}',  JSON.stringify(topic, null, 2))
}

export const chatRouter = Router()

chatRouter.post('/chat', async (req, res) => {
	const { topic, history, message, config } = req.body as ChatRequest

	const systemPrompt = buildSystemPrompt(
		config.systemPromptTemplate,
		topic,
		config.domainName,
	)

	res.setHeader('Content-Type', 'application/x-ndjson')
	res.setHeader('Transfer-Encoding', 'chunked')
	res.setHeader('Cache-Control', 'no-cache')

	try {
		const stream = client.messages.stream({
			model:      'claude-haiku-4-5-20251001',
			max_tokens: 1024,
			system:     systemPrompt,
			messages: [
				...history.map(m => ({ role: m.role, content: m.content })),
				{ role: 'user', content: message },
			],
		})

		for await (const event of stream) {
			if (
				event.type === 'content_block_delta' &&
				event.delta.type === 'text_delta'
			) {
				res.write(JSON.stringify({ chunk: event.delta.text }) + '\n')
			}
		}

		res.end()
	} catch (err) {
		res.write(JSON.stringify({ error: String(err) }) + '\n')
		res.end()
	}
})
```

- [ ] **Step 2: Create server/pipeline.ts stub**

Create a temporary stub so `server/index.ts` can import it (full implementation in Task 6):
```typescript
// server/pipeline.ts
import { Router } from 'express'
export const pipelineRouter = Router()
```

- [ ] **Step 3: Create server/index.ts**

```typescript
// server/index.ts
import express from 'express'
import { chatRouter }     from './chat.js'
import { pipelineRouter } from './pipeline.js'

const app = express()

app.use(express.json())
app.use('/api', chatRouter)
app.use('/api', pipelineRouter)

const PORT = 3001
app.listen(PORT, () => console.log(`Server listening on :${PORT}`))
```

- [ ] **Step 4: Type-check**

```bash
npx tsc -p tsconfig.server.json --noEmit
```
Expected: no errors.

- [ ] **Step 5: Verify server starts**

```bash
npx tsx server/index.ts
```
Expected: `Server listening on :3001`
Stop with Ctrl+C.

- [ ] **Step 6: Commit**

```bash
git add server/chat.ts server/index.ts server/pipeline.ts
git commit -m "refactor: extract chatRouter, add server/index.ts entry point"
```

---

### Task 6: Implement server/pipeline.ts

**Files:**
- Modify: `server/pipeline.ts` (replace stub)

- [ ] **Step 1: Replace server/pipeline.ts stub with full implementation**

```typescript
// server/pipeline.ts
import { Router } from 'express'
import multer from 'multer'
import Anthropic from '@anthropic-ai/sdk'
import { existsSync, readFileSync, mkdirSync, readdirSync } from 'fs'
import { join } from 'path'
import { domainStore }        from './domain-store.js'
import { runPipeline }        from '../pipeline/service.js'
import { writeCurriculumJson } from '../pipeline/json-writer.js'
import type { PipelineConfig } from '../pipeline/types.js'
import type { Domain }         from './domain-store.js'

const client   = new Anthropic({ apiKey: process.env['ANTHROPIC_API_KEY'] })
const DATA_DIR = join(process.cwd(), 'data')

const upload = multer({
	storage: multer.diskStorage({
		destination: (req, _file, cb) => {
			const dir = join(DATA_DIR, 'sources', (req.params as { domain: string }).domain)
			mkdirSync(dir, { recursive: true })
			cb(null, dir)
		},
		filename: (_req, file, cb) => cb(null, file.originalname),
	}),
	fileFilter: (_req, file, cb) => {
		cb(null, file.originalname.endsWith('.md') || file.originalname.endsWith('.txt'))
	},
})

export const pipelineRouter = Router()

// POST /api/domains
pipelineRouter.post('/domains', (req, res) => {
	const { id, name, description } = req.body as { id?: string; name?: string; description?: string }
	if (!id || !name || !description) {
		res.status(400).json({ error: 'id, name, and description are required' })
		return
	}
	if (domainStore.getDomain(id)) {
		res.status(409).json({ error: 'domain already exists' })
		return
	}
	const domain: Domain = {
		id, name, description,
		createdAt:  new Date().toISOString(),
		lastRun:    null,
		topicCount: null,
	}
	domainStore.addDomain(domain)
	res.status(201).json({ domain })
})

// GET /api/domains
pipelineRouter.get('/domains', (_req, res) => {
	res.json({ domains: domainStore.getDomains() })
})

// POST /api/pipeline/upload/:domain
pipelineRouter.post('/pipeline/upload/:domain', upload.array('sources'), (req, res) => {
	const domainId = (req.params as { domain: string }).domain
	if (!domainStore.getDomain(domainId)) {
		res.status(404).json({ error: 'domain not found' })
		return
	}
	const files = (req.files as Express.Multer.File[]) ?? []
	res.json({ uploaded: files.map(f => f.originalname) })
})

// POST /api/pipeline/run/:domain
pipelineRouter.post('/pipeline/run/:domain', async (req, res) => {
	const domainId = (req.params as { domain: string }).domain
	const domain   = domainStore.getDomain(domainId)
	if (!domain) {
		res.status(404).json({ error: 'domain not found' })
		return
	}

	const sourcesDir = join(DATA_DIR, 'sources', domainId)
	const hasFiles   =
		existsSync(sourcesDir) &&
		readdirSync(sourcesDir).some(f => f.endsWith('.md') || f.endsWith('.txt'))
	if (!hasFiles) {
		res.status(400).json({ error: 'no source files found' })
		return
	}

	const config: PipelineConfig = {
		domain: {
			name:            domain.name,
			description:     domain.description,
			defaultCategory: '',
			defaultTopic:    '',
			labels:          { category: 'Category', topic: 'Topic' },
		},
		extraction: {
			model:         (req.body as { model?: string }).model ?? 'claude-haiku-4-5-20251001',
			maxChunkChars: 12000,
		},
		output: { dir: join(DATA_DIR, 'curriculum', domainId) },
	}

	const start = Date.now()
	try {
		const result    = await runPipeline(config, sourcesDir, client)
		const outputDir = join(DATA_DIR, 'curriculum', domainId)
		const { topicCount, familyCount } = writeCurriculumJson(
			result.grouped, result.tutorConfig, domainId, outputDir,
		)
		domainStore.updateDomain(domainId, {
			lastRun:    new Date().toISOString(),
			topicCount,
		})
		res.json({ topicCount, familyCount, durationMs: Date.now() - start })
	} catch (err) {
		res.status(500).json({ error: String(err) })
	}
})

// GET /api/domains/:domain/curriculum
pipelineRouter.get('/domains/:domain/curriculum', (req, res) => {
	const curriculumPath = join(
		DATA_DIR, 'curriculum',
		(req.params as { domain: string }).domain,
		'curriculum.json',
	)
	if (!existsSync(curriculumPath)) {
		res.status(404).json({ error: 'curriculum not found — run the pipeline first' })
		return
	}
	res.json(JSON.parse(readFileSync(curriculumPath, 'utf-8')))
})
```

- [ ] **Step 2: Type-check**

```bash
npx tsc -p tsconfig.server.json --noEmit
```
Expected: no errors.

- [ ] **Step 3: Smoke-test the endpoints**

Start the server in one terminal:
```bash
npx tsx server/index.ts
```

In a second terminal, run these in order:

Register a domain:
```bash
curl -s -X POST http://localhost:3001/api/domains \
  -H "Content-Type: application/json" \
  -d '{"id":"test","name":"Test","description":"Test domain"}'
```
Expected: `{"domain":{"id":"test","name":"Test","description":"Test domain","createdAt":"...","lastRun":null,"topicCount":null}}`

List domains:
```bash
curl -s http://localhost:3001/api/domains
```
Expected: `{"domains":[{"id":"test",...}]}`

Request non-existent curriculum:
```bash
curl -s http://localhost:3001/api/domains/test/curriculum
```
Expected: `{"error":"curriculum not found — run the pipeline first"}`

Stop the server with Ctrl+C. Delete `data/` to clean up:
```bash
Remove-Item -Recurse -Force data
```

- [ ] **Step 4: Run all tests**

```bash
npx vitest run
```
Expected: 43 tests pass.

- [ ] **Step 5: Commit**

```bash
git add server/pipeline.ts
git commit -m "feat: implement pipeline API router with 5 endpoints"
```

---

### Task 7: Create scripts/seed-rxjs-domain.ts

This script writes `data/domains.json` and `data/curriculum/rxjs/curriculum.json` from the existing static RxJS data so the SPA can fetch curriculum at runtime.

**Files:**
- Create: `scripts/seed-rxjs-domain.ts`
- Modify: `package.json` (add seed script)

- [ ] **Step 1: Create scripts/seed-rxjs-domain.ts**

```typescript
// scripts/seed-rxjs-domain.ts
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { topics, families } from '../src/curriculum/index.js'
import { config }           from '../src/tutor.config.js'
import type { CurriculumJson } from '../src/curriculum/types.js'
import type { Domain }        from '../server/domain-store.js'

const DATA_DIR       = join(process.cwd(), 'data')
const REGISTRY_PATH  = join(DATA_DIR, 'domains.json')
const CURRICULUM_DIR = join(DATA_DIR, 'curriculum', 'rxjs')

mkdirSync(DATA_DIR, { recursive: true })
mkdirSync(CURRICULUM_DIR, { recursive: true })

// Register rxjs domain if not already present
interface DomainRegistry { domains: Domain[] }
let registry: DomainRegistry = { domains: [] }
if (existsSync(REGISTRY_PATH)) {
	registry = JSON.parse(readFileSync(REGISTRY_PATH, 'utf-8')) as DomainRegistry
}
if (!registry.domains.find(d => d.id === 'rxjs')) {
	const domain: Domain = {
		id:          'rxjs',
		name:        config.domainName,
		description: 'RxJS reactive programming library operators',
		createdAt:   new Date().toISOString(),
		lastRun:     new Date().toISOString(),
		topicCount:  topics.length,
	}
	registry.domains.push(domain)
	writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2), 'utf-8')
	console.log('Registered rxjs domain.')
} else {
	console.log('rxjs domain already registered — updating curriculum.')
}

// Write curriculum.json
const curriculum: CurriculumJson = {
	domain:      'rxjs',
	generatedAt: new Date().toISOString(),
	topics,
	families,
	tutorConfig: config,
}
writeFileSync(
	join(CURRICULUM_DIR, 'curriculum.json'),
	JSON.stringify(curriculum, null, 2),
	'utf-8',
)
console.log(`Wrote data/curriculum/rxjs/curriculum.json (${topics.length} topics, ${families.length} families).`)
```

- [ ] **Step 2: Add seed script to package.json**

In `package.json`, add to `scripts`:
```json
"seed": "tsx scripts/seed-rxjs-domain.ts"
```

- [ ] **Step 3: Run the seed script**

```bash
npx tsx scripts/seed-rxjs-domain.ts
```
Expected output:
```
Registered rxjs domain.
Wrote data/curriculum/rxjs/curriculum.json (N topics, 17 families).
```

- [ ] **Step 4: Verify the output via the server**

Start the server: `npx tsx server/index.ts`

Fetch the curriculum:
```bash
curl -s http://localhost:3001/api/domains/rxjs/curriculum | npx node -e "const d=require('fs').readFileSync(0,'utf-8');const p=JSON.parse(d);console.log('topics:',p.topics.length,'families:',p.families.length)"
```
Expected: `topics: N  families: 17`

Stop the server (Ctrl+C).

- [ ] **Step 5: Commit**

```bash
git add scripts/seed-rxjs-domain.ts package.json
git commit -m "feat: add seed script to populate data/ from static RxJS curriculum"
```

---

### Task 8: Frontend — curriculum state, actions, reducer

**Files:**
- Modify: `src/mvu/actions.ts`
- Modify: `src/mvu/model.ts`
- Modify: `src/mvu/reducer.ts`
- Modify: `tests/reducer.test.ts` (add curriculum action tests)

- [ ] **Step 1: Write failing reducer tests**

Add these tests to the bottom of `tests/reducer.test.ts` (inside the `describe('reducer', ...)` block):
```typescript
	test('CURRICULUM_LOADED sets topics, families, tutorConfig, status ready', () => {
		const t1: Topic = mockTopic('map')
		const family    = { name: 'Transformation', description: '', topics: [t1] }
		const tutor     = {
			domainName:           'RxJS',
			systemPromptTemplate: 'You are a {domainName} tutor.',
			defaultCategory:      'Transformation',
			defaultTopic:         'map',
			labels:               { category: 'Family', topic: 'Operator' },
		}
		const state = reducer(initialState, {
			type:       'CURRICULUM_LOADED',
			topics:     [t1],
			families:   [family],
			tutorConfig: tutor,
		})
		expect(state.topics).toEqual([t1])
		expect(state.families).toHaveLength(1)
		expect(state.tutorConfig?.domainName).toBe('RxJS')
		expect(state.curriculumStatus).toBe('ready')
		expect(state.curriculumError).toBeNull()
	})

	test('CURRICULUM_FAILED sets status error with message', () => {
		const state = reducer(initialState, {
			type:  'CURRICULUM_FAILED',
			error: 'Network error',
		})
		expect(state.curriculumStatus).toBe('error')
		expect(state.curriculumError).toBe('Network error')
	})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/reducer.test.ts
```
Expected: FAIL on the two new tests — `CURRICULUM_LOADED` and `CURRICULUM_FAILED` not in Action union.

- [ ] **Step 3: Update src/mvu/actions.ts**

Replace the full file:
```typescript
// src/mvu/actions.ts
import type { Topic, Family, TutorConfig } from '../curriculum/types'

export type Action =
	| { type: 'TOPIC_SELECTED';        topic: Topic }
	| { type: 'CATEGORY_TOGGLED';      category: string }
	| { type: 'SEARCH_CHANGED';        query: string }
	| { type: 'CHAT_MESSAGE_SENT';     content: string }
	| { type: 'CHAT_CHUNK_RECEIVED';   chunk: string }
	| { type: 'CHAT_RESPONSE_COMPLETE' }
	| { type: 'CHAT_ERROR';            message: string }
	| { type: 'CURRICULUM_LOADED';     topics: Topic[]; families: Family[]; tutorConfig: TutorConfig }
	| { type: 'CURRICULUM_FAILED';     error: string }
```

- [ ] **Step 4: Update src/mvu/model.ts**

Replace the full file:
```typescript
// src/mvu/model.ts
import type { Topic, Family, TutorConfig } from '../curriculum/types'

export type CurriculumStatus = 'loading' | 'ready' | 'error'

export interface ChatMessage {
	role: 'user' | 'assistant'
	content: string
}

export interface ChatState {
	history: ChatMessage[]
	loading: boolean
	error:   string | null
}

export interface AppState {
	selectedCategory: string | null
	selectedTopic:    Topic | null
	searchQuery:      string
	sidebarExpanded:  Set<string>
	chat:             ChatState
	topics:           Topic[]
	families:         Family[]
	tutorConfig:      TutorConfig | null
	curriculumStatus: CurriculumStatus
	curriculumError:  string | null
}

export const initialState: AppState = {
	selectedCategory: null,
	selectedTopic:    null,
	searchQuery:      '',
	sidebarExpanded:  new Set(),
	chat:             { history: [], loading: false, error: null },
	topics:           [],
	families:         [],
	tutorConfig:      null,
	curriculumStatus: 'loading',
	curriculumError:  null,
}
```

- [ ] **Step 5: Update src/mvu/reducer.ts**

Replace the full file:
```typescript
// src/mvu/reducer.ts
import type { AppState } from './model'
import type { Action }   from './actions'

export function reducer(state: AppState, action: Action): AppState {
	switch (action.type) {
		case 'TOPIC_SELECTED':
			return {
				...state,
				selectedTopic:    action.topic,
				selectedCategory: action.topic.category,
				chat: { history: [], loading: false, error: null },
			}

		case 'CATEGORY_TOGGLED': {
			const next = new Set(state.sidebarExpanded)
			if (next.has(action.category)) next.delete(action.category)
			else next.add(action.category)
			return { ...state, sidebarExpanded: next }
		}

		case 'SEARCH_CHANGED':
			return { ...state, searchQuery: action.query }

		case 'CHAT_MESSAGE_SENT':
			return {
				...state,
				chat: {
					history: [
						...state.chat.history,
						{ role: 'user',      content: action.content },
						{ role: 'assistant', content: '' },
					],
					loading: true,
					error:   null,
				},
			}

		case 'CHAT_CHUNK_RECEIVED': {
			const history = [...state.chat.history]
			const last    = history[history.length - 1]
			history[history.length - 1] = { ...last, content: last!.content + action.chunk }
			return { ...state, chat: { ...state.chat, history } }
		}

		case 'CHAT_RESPONSE_COMPLETE':
			return { ...state, chat: { ...state.chat, loading: false } }

		case 'CHAT_ERROR':
			return { ...state, chat: { ...state.chat, loading: false, error: action.message } }

		case 'CURRICULUM_LOADED':
			return {
				...state,
				topics:           action.topics,
				families:         action.families,
				tutorConfig:      action.tutorConfig,
				curriculumStatus: 'ready',
				curriculumError:  null,
			}

		case 'CURRICULUM_FAILED':
			return {
				...state,
				curriculumStatus: 'error',
				curriculumError:  action.error,
			}

		default:
			return state
	}
}
```

- [ ] **Step 6: Run reducer tests to verify they pass**

```bash
npx vitest run tests/reducer.test.ts
```
Expected: PASS (9 tests — 7 existing + 2 new).

- [ ] **Step 7: Run all tests**

```bash
npx vitest run
```
Expected: all 43 + 2 = 45 tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/mvu/actions.ts src/mvu/model.ts src/mvu/reducer.ts tests/reducer.test.ts
git commit -m "feat: add curriculum loaded/failed actions and state"
```

---

### Task 9: Frontend — curriculum effect + store update

**Files:**
- Create: `src/effects/curriculum.effects.ts`
- Modify: `src/mvu/store.ts`
- Modify: `src/effects/chat.effects.ts`

- [ ] **Step 1: Create src/effects/curriculum.effects.ts**

```typescript
// src/effects/curriculum.effects.ts
import { Observable } from 'rxjs'
import type { Action }          from '../mvu/actions'
import type { CurriculumJson }  from '../curriculum/types'

export function fetchCurriculum(domain: string): Observable<Action> {
	return new Observable<Action>(observer => {
		fetch(`/api/domains/${domain}/curriculum`)
			.then(res => {
				if (!res.ok) throw new Error(`HTTP ${res.status}`)
				return res.json() as Promise<CurriculumJson>
			})
			.then(data => {
				observer.next({
					type:        'CURRICULUM_LOADED',
					topics:      data.topics,
					families:    data.families,
					tutorConfig: data.tutorConfig,
				})
				observer.complete()
			})
			.catch(err => {
				observer.next({ type: 'CURRICULUM_FAILED', error: String(err) })
				observer.complete()
			})
	})
}
```

- [ ] **Step 2: Update src/mvu/store.ts**

Replace the full file:
```typescript
// src/mvu/store.ts
import { Subject, combineLatest } from 'rxjs'
import { scan, startWith, shareReplay, map, distinctUntilChanged, filter } from 'rxjs'
import { reducer }       from './reducer'
import { initialState }  from './model'
import type { Action }   from './actions'
import type { TutorConfig } from '../curriculum/types'

export const action$ = new Subject<Action>()

export const state$ = action$.pipe(
	scan(reducer, initialState),
	startWith(initialState),
	shareReplay(1),
)

export const ofType = <K extends Action['type']>(type: K) =>
	filter((a: Action): a is Extract<Action, { type: K }> => a.type === type)

export const selectedTopic$ = state$.pipe(
	map(s => s.selectedTopic),
	distinctUntilChanged(),
)

export const searchQuery$ = state$.pipe(
	map(s => s.searchQuery),
	distinctUntilChanged(),
)

export const chatState$ = state$.pipe(
	map(s => s.chat),
	distinctUntilChanged(),
)

export const sidebarExpanded$ = state$.pipe(
	map(s => s.sidebarExpanded),
	distinctUntilChanged(),
)

export const topics$ = state$.pipe(
	map(s => s.topics),
	distinctUntilChanged(),
)

export const families$ = state$.pipe(
	map(s => s.families),
	distinctUntilChanged(),
)

export const tutorConfig$ = state$.pipe(
	map(s => s.tutorConfig),
	distinctUntilChanged(),
)

export const curriculumStatus$ = state$.pipe(
	map(s => s.curriculumStatus),
	distinctUntilChanged(),
)

export const filteredTopics$ = combineLatest([topics$, searchQuery$]).pipe(
	map(([ts, q]) => q
		? ts.filter(t =>
				t.name.toLowerCase().includes(q.toLowerCase()) ||
				t.tags.some(tag => tag.includes(q.toLowerCase()))
			)
		: ts
	),
)
```

- [ ] **Step 3: Update src/effects/chat.effects.ts**

Replace the full file to read config from state instead of the static import:
```typescript
// src/effects/chat.effects.ts
import { Observable, of, endWith } from 'rxjs'
import { exhaustMap, withLatestFrom, map, catchError } from 'rxjs'
import { action$, ofType, state$ } from '../mvu/store'
import type { Action } from '../mvu/actions'

function streamChunks(res: Response): Observable<string> {
	return new Observable<string>(observer => {
		const reader  = res.body!.getReader()
		const decoder = new TextDecoder()
		let buffer    = ''

		async function pump(): Promise<void> {
			try {
				while (true) {
					const { done, value } = await reader.read()
					if (done) { observer.complete(); return }
					buffer += decoder.decode(value, { stream: true })
					const lines = buffer.split('\n')
					buffer = lines.pop() ?? ''
					for (const line of lines) {
						const trimmed = line.trim()
						if (!trimmed) continue
						try {
							const parsed: unknown = JSON.parse(trimmed)
							if (
								typeof parsed === 'object' &&
								parsed !== null &&
								'chunk' in parsed &&
								typeof (parsed as { chunk?: unknown }).chunk === 'string'
							) {
								observer.next((parsed as { chunk: string }).chunk)
							}
						} catch { /* skip malformed line */ }
					}
				}
			} catch (err) {
				observer.error(err)
			}
		}

		void pump()
		return () => void reader.cancel()
	})
}

export const chatEffect$ = action$.pipe(
	ofType('CHAT_MESSAGE_SENT'),
	withLatestFrom(state$),
	exhaustMap(([action, state]) => {
		if (!state.selectedTopic) return of<Action>({ type: 'CHAT_ERROR', message: 'No topic selected' })
		if (!state.tutorConfig)   return of<Action>({ type: 'CHAT_ERROR', message: 'Curriculum not loaded' })

		const tutorConfig = state.tutorConfig

		return new Observable<Action>(observer => {
			fetch('/api/chat', {
				method:  'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					topic:   state.selectedTopic,
					history: state.chat.history.slice(0, -2),
					message: action.content,
					config: {
						domainName:           tutorConfig.domainName,
						systemPromptTemplate: tutorConfig.systemPromptTemplate,
					},
				}),
			})
				.then(res => {
					if (!res.ok) throw new Error(`HTTP ${res.status}`)
					return streamChunks(res).pipe(
						map((chunk): Action => ({ type: 'CHAT_CHUNK_RECEIVED', chunk })),
						endWith<Action>({ type: 'CHAT_RESPONSE_COMPLETE' }),
						catchError(err => of<Action>({ type: 'CHAT_ERROR', message: String(err) })),
					)
				})
				.then(obs$ => obs$.subscribe(observer))
				.catch(err => {
					observer.next({ type: 'CHAT_ERROR', message: String(err) })
					observer.complete()
				})
		})
	}),
)
```

- [ ] **Step 4: Type-check the frontend**

```bash
npx tsc -p tsconfig.json --noEmit
```
Expected: no errors.

- [ ] **Step 5: Run all tests**

```bash
npx vitest run
```
Expected: 45 tests pass. (Store tests pass because they have their own local `makeStore` that is not affected by the store module change.)

- [ ] **Step 6: Commit**

```bash
git add src/effects/curriculum.effects.ts src/mvu/store.ts src/effects/chat.effects.ts
git commit -m "feat: add curriculum fetch effect, update store to read topics from state"
```

---

### Task 10: Frontend — views, router, main.ts, loading overlay

**Files:**
- Modify: `src/views/sidebar.ts`
- Modify: `src/router.ts`
- Modify: `src/main.ts`
- Modify: `index.html`

- [ ] **Step 1: Update src/views/sidebar.ts**

Remove the static `import { families } from '../curriculum/index'` and add `families` as a parameter. Replace the full file:
```typescript
// src/views/sidebar.ts
import type { Topic, Family, TutorConfig } from '../curriculum/types'
import type { AppState } from '../mvu/model'
import { action$ } from '../mvu/store'
import { navigateTo } from '../router'

let keyListenerRegistered = false

function escapeHtml(s: string): string {
	return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

function renderFamilyItem(
	category:       string,
	filteredTopics: Topic[],
	expanded:       Set<string>,
	selected:       Topic | null,
): string {
	const isExpanded = expanded.has(category)
	const topicItems = filteredTopics
		.filter(t => t.category === category)
		.map(t => {
			const isActive = selected?.name === t.name && selected?.category === t.category
			return `<span
			class="sidebar-operator ${isActive ? 'sidebar-operator--active' : ''}"
			data-op-name="${escapeHtml(t.name)}"
			data-op-category="${escapeHtml(t.category)}"
		>${escapeHtml(t.name)}</span>`
		}).join('')

	return `<div class="sidebar-family">
		<div class="sidebar-family__header" data-toggle-category="${escapeHtml(category)}">
			<span class="sidebar-family__arrow">${isExpanded ? '▾' : '▸'}</span>
			${escapeHtml(category)}
		</div>
		${isExpanded ? `<div class="sidebar-family__operators">${topicItems}</div>` : ''}
	</div>`
}

export function renderSidebar(
	filteredTopics: Topic[],
	families:       Family[],
	state:          AppState,
	config:         TutorConfig,
): void {
	const el = document.getElementById('sidebar')!

	el.innerHTML = `
		<div class="sidebar-brand">${escapeHtml(config.domainName)} Tutor</div>
		<input
			id="sidebar-search"
			class="sidebar-search"
			type="text"
			placeholder="Search ${escapeHtml(config.labels.topic.toLowerCase())}s… ⌘K"
			value="${escapeHtml(state.searchQuery)}"
			autocomplete="off"
		>
		<div class="sidebar-section-label">${escapeHtml(config.labels.category + 's')}</div>
		<div class="sidebar-families">
			${families.map(f =>
				renderFamilyItem(f.name, filteredTopics, state.sidebarExpanded, state.selectedTopic)
			).join('')}
		</div>
	`

	const input = el.querySelector<HTMLInputElement>('#sidebar-search')!
	input.addEventListener('input', () =>
		action$.next({ type: 'SEARCH_CHANGED', query: input.value })
	)

	if (!keyListenerRegistered) {
		keyListenerRegistered = true
		document.addEventListener('keydown', e => {
			if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
				e.preventDefault()
				const searchInput = document.getElementById('sidebar-search') as HTMLInputElement | null
				if (searchInput) searchInput.focus()
			}
		})
	}

	el.querySelectorAll<HTMLElement>('[data-toggle-category]').forEach(header => {
		header.addEventListener('click', () => {
			const category = header.dataset.toggleCategory
			if (category) action$.next({ type: 'CATEGORY_TOGGLED', category })
		})
	})

	el.querySelectorAll<HTMLElement>('[data-op-name]').forEach(span => {
		span.addEventListener('click', () => {
			const name     = span.dataset.opName!
			const category = span.dataset.opCategory!
			const t        = filteredTopics.find(t => t.name === name && t.category === category)
			if (t) {
				action$.next({ type: 'TOPIC_SELECTED', topic: t })
				navigateTo(category, name)
			}
		})
	})
}
```

- [ ] **Step 2: Update src/router.ts**

Remove the static `import { topics }` and add `topics` as a second parameter to `initRouter`. Replace the full file:
```typescript
// src/router.ts
import { fromEvent, startWith, EMPTY, Subscription } from 'rxjs'
import { map, distinctUntilChanged } from 'rxjs'
import { action$ } from './mvu/store'
import type { Topic, TutorConfig } from './curriculum/types'

export interface Route {
	category:    string | null
	topic:       string | null
	searchQuery: string | null
}

export function parseRoute(pathname: string): Route {
	const url         = new URL(pathname, 'http://x')
	const searchQuery = url.searchParams.get('q')
	const parts       = url.pathname.split('/').filter(Boolean)

	return {
		category:    parts[0] ?? null,
		topic:       parts[1] ?? null,
		searchQuery,
	}
}

export function navigateTo(category: string, topicName: string): void {
	const path = `/${category.toLowerCase()}/${topicName}`
	window.history.pushState({}, '', path)
}

const isBrowser = typeof window !== 'undefined'

export const route$ = isBrowser
	? fromEvent(window, 'popstate').pipe(
		startWith(null),
		map(() => parseRoute(window.location.pathname)),
		distinctUntilChanged((a, b) =>
			a.category === b.category && a.topic === b.topic && a.searchQuery === b.searchQuery
		),
	)
	: EMPTY

export function initRouter(config: TutorConfig, topics: Topic[]): Subscription {
	return route$.subscribe(route => {
		if (route.searchQuery !== null) {
			action$.next({ type: 'SEARCH_CHANGED', query: route.searchQuery })
			return
		}
		if (route.topic && route.category) {
			const t = topics.find(
				t => t.name === route.topic &&
				     t.category.toLowerCase() === route.category!.toLowerCase()
			)
			if (t) action$.next({ type: 'TOPIC_SELECTED', topic: t })
		}
		if (!route.category && !route.topic) {
			const defaultTopic = topics.find(
				t => t.name === config.defaultTopic &&
					 t.category.toLowerCase() === config.defaultCategory.toLowerCase()
			)
			if (defaultTopic) {
				action$.next({ type: 'TOPIC_SELECTED', topic: defaultTopic })
				navigateTo(defaultTopic.category, defaultTopic.name)
			}
		}
	})
}
```

- [ ] **Step 3: Update index.html**

Replace the full content of `index.html`:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RxJS Tutor</title>
  <link rel="stylesheet" href="/src/style.css">
</head>
<body>
  <div id="loading" style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:monospace;font-size:14px;color:#666;">
    Loading curriculum…
  </div>
  <div id="app" style="display:none;">
    <nav id="sidebar"></nav>
    <main id="reference"></main>
    <aside id="chat"></aside>
  </div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

- [ ] **Step 4: Replace src/main.ts**

```typescript
// src/main.ts
import './style.css'
import { combineLatest, filter, take } from 'rxjs'
import { withLatestFrom } from 'rxjs'
import {
	action$, state$, filteredTopics$, families$,
	selectedTopic$, chatState$, tutorConfig$, curriculumStatus$, ofType,
} from './mvu/store'
import { renderSidebar }             from './views/sidebar'
import { renderReference }           from './views/reference'
import { renderChat, appendChatChunk } from './views/chat'
import { chatEffect$ }               from './effects/chat.effects'
import { fetchCurriculum }           from './effects/curriculum.effects'
import { initRouter }                from './router'
import type { TutorConfig }          from './curriculum/types'

// ── Curriculum fetch ──────────────────────────────────────────────────
fetchCurriculum('rxjs').subscribe(action$)

// ── Loading overlay ───────────────────────────────────────────────────
curriculumStatus$.subscribe(status => {
	const loading = document.getElementById('loading')
	const app     = document.getElementById('app')
	if (loading) loading.style.display = status === 'ready' ? 'none' : 'flex'
	if (app)     app.style.display     = status === 'ready' ? 'grid' : 'none'
	if (status === 'error') {
		if (loading) loading.textContent = 'Failed to load curriculum. Is the server running?'
	}
})

const config$ = tutorConfig$.pipe(filter((c): c is TutorConfig => c !== null))

// ── Sidebar ──────────────────────────────────────────────────────────
combineLatest([filteredTopics$, families$, state$, config$]).subscribe(
	([ts, fam, state, config]) => renderSidebar(ts, fam, state, config)
)

// ── Reference panel ──────────────────────────────────────────────────
combineLatest([selectedTopic$, config$]).subscribe(
	([t, config]) => renderReference(t, config)
)

// ── Chat panel ───────────────────────────────────────────────────────
action$.pipe(
	filter(a => ['TOPIC_SELECTED', 'CHAT_MESSAGE_SENT', 'CHAT_RESPONSE_COMPLETE', 'CHAT_ERROR'].includes(a.type)),
	withLatestFrom(combineLatest([chatState$, selectedTopic$, config$]))
).subscribe(([_action, [chat, t, config]]) => renderChat(chat, t, config))

action$.pipe(ofType('CHAT_CHUNK_RECEIVED')).subscribe(a => appendChatChunk(a.chunk))

// ── Effects ───────────────────────────────────────────────────────────
chatEffect$.subscribe(action$)

// ── Router ────────────────────────────────────────────────────────────
combineLatest([config$, state$.pipe(filter(s => s.topics.length > 0))]).pipe(
	take(1),
).subscribe(([config, state]) => {
	initRouter(config, state.topics)
})
```

- [ ] **Step 5: Type-check**

```bash
npx tsc -p tsconfig.json --noEmit
```
Expected: no errors.

- [ ] **Step 6: Run all tests**

```bash
npx vitest run
```
Expected: 45 tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/views/sidebar.ts src/router.ts src/main.ts index.html
git commit -m "feat: switch SPA to runtime curriculum fetch, add loading state"
```

---

### Task 11: End-to-end verification

- [ ] **Step 1: Seed the rxjs domain (if not already done)**

```bash
npx tsx scripts/seed-rxjs-domain.ts
```
Expected: writes `data/curriculum/rxjs/curriculum.json`.

- [ ] **Step 2: Start the full dev environment**

```bash
npm run dev
```
Expected: Vite starts on port 5173, server starts on port 3001.

- [ ] **Step 3: Open the app in a browser**

Navigate to `http://localhost:5173`.

Verify:
- Loading message appears briefly
- App renders with RxJS Tutor sidebar showing operator families
- Clicking an operator opens the reference panel
- Chat input works (select an operator, type a message, get a streamed response)

- [ ] **Step 4: Test the pipeline API with curl**

In a separate terminal:

```bash
curl -s -X POST http://localhost:3001/api/domains \
  -H "Content-Type: application/json" \
  -d '{"id":"typescript","name":"TypeScript","description":"TypeScript language features and type system"}'
```
Expected: 201 with domain object.

```bash
curl -s -X POST http://localhost:3001/api/pipeline/upload/typescript \
  -F "sources=@pipeline/domains/typescript/sources/utility-types.md" \
  -F "sources=@pipeline/domains/typescript/sources/generics.md"
```
Expected: `{"uploaded":["utility-types.md","generics.md"]}`

```bash
curl -s -X POST http://localhost:3001/api/pipeline/run/typescript \
  -H "Content-Type: application/json" \
  -d '{}'
```
Expected: `{"topicCount":16,"familyCount":2,"durationMs":...}` (takes ~30 seconds — Claude extraction runs).

```bash
curl -s http://localhost:3001/api/domains/typescript/curriculum | npx node -e "const d=require('fs').readFileSync(0,'utf-8');const p=JSON.parse(d);console.log('topics:',p.topics.length)"
```
Expected: `topics: 16`

- [ ] **Step 5: Run final test suite**

```bash
npx vitest run
```
Expected: all 45 tests pass.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: Phase 3 complete — pipeline hosting, domain registry, runtime curriculum"
```
