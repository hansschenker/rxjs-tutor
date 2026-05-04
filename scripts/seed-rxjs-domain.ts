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
