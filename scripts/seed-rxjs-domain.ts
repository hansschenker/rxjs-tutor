// scripts/seed-rxjs-domain.ts
import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { topics, families } from '../src/curriculum/index.js'
import { config }           from '../src/tutor.config.js'
import { domainStore }      from '../server/domain-store.js'
import type { CurriculumJson } from '../src/curriculum/types.js'

const DATA_DIR       = join(process.cwd(), 'data')
const CURRICULUM_DIR = join(DATA_DIR, 'curriculum', 'rxjs')

mkdirSync(DATA_DIR, { recursive: true })
mkdirSync(CURRICULUM_DIR, { recursive: true })

// Register or update rxjs domain
const existing = domainStore.getDomain('rxjs')
if (!existing) {
	domainStore.addDomain({
		id:          'rxjs',
		name:        config.domainName,
		description: 'RxJS reactive programming library operators',
		createdAt:   new Date().toISOString(),
		lastRun:     new Date().toISOString(),
		topicCount:  topics.length,
	})
	console.log('Registered rxjs domain.')
} else {
	domainStore.updateDomain('rxjs', {
		lastRun:    new Date().toISOString(),
		topicCount: topics.length,
	})
	console.log('rxjs domain already registered — updated lastRun and topicCount.')
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
