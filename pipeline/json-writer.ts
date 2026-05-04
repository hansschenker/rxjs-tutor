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
