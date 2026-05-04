// server/pipeline.ts
import { Router, Request, Response, NextFunction } from 'express'
import multer from 'multer'
import Anthropic from '@anthropic-ai/sdk'
import { existsSync, readFileSync, mkdirSync, readdirSync } from 'fs'
import { join } from 'path'
import { domainStore }         from './domain-store.js'
import { runPipeline }         from '../pipeline/service.js'
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
	if (!/^[a-z0-9_-]+$/i.test(id)) {
		res.status(400).json({ error: 'id must contain only letters, digits, hyphens, and underscores' })
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
pipelineRouter.post(
	'/pipeline/upload/:domain',
	(req: Request, res: Response, next: NextFunction) => {
		const domainId = (req.params as { domain: string }).domain
		if (!/^[a-z0-9_-]+$/i.test(domainId)) {
			res.status(400).json({ error: 'invalid domain id' })
			return
		}
		if (!domainStore.getDomain(domainId)) {
			res.status(404).json({ error: 'domain not found' })
			return
		}
		next()
	},
	upload.array('sources'),
	(req: Request, res: Response) => {
		const files = (req.files as Express.Multer.File[]) ?? []
		res.json({ uploaded: files.map(f => f.originalname) })
	},
)

// POST /api/pipeline/run/:domain
pipelineRouter.post('/pipeline/run/:domain', async (req, res) => {
	const domainId = (req.params as { domain: string }).domain
	if (!/^[a-z0-9_-]+$/i.test(domainId)) {
		res.status(400).json({ error: 'invalid domain id' })
		return
	}
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
	const domainParam = (req.params as { domain: string }).domain
	if (!/^[a-z0-9_-]+$/i.test(domainParam)) {
		res.status(400).json({ error: 'invalid domain id' })
		return
	}
	const curriculumPath = join(
		DATA_DIR, 'curriculum',
		domainParam,
		'curriculum.json',
	)
	if (!existsSync(curriculumPath)) {
		res.status(404).json({ error: 'curriculum not found — run the pipeline first' })
		return
	}
	try {
		res.json(JSON.parse(readFileSync(curriculumPath, 'utf-8')))
	} catch {
		res.status(500).json({ error: 'curriculum file is unreadable or malformed' })
	}
})
