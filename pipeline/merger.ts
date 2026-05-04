// pipeline/merger.ts

import type { ExtractionResult, RawTopic } from './types.js'

export function mergeTopics(results: ExtractionResult[]): RawTopic[] {
	const seen = new Map<string, RawTopic>()

	for (const { topics } of results) {
		for (const topic of topics) {
			const key      = topic.name.toLowerCase()
			const existing = seen.get(key)
			if (!existing) {
				seen.set(key, { ...topic })
			} else {
				const existingExamples = existing.examples ?? []
				const newExamples      = (topic.examples ?? []).filter(
					e => !existingExamples.some(x => x.title === e.title)
				)
				seen.set(key, {
					...existing,
					examples: [...existingExamples, ...newExamples],
					tags:     [...new Set([...(existing.tags ?? []), ...(topic.tags ?? [])])],
					seeAlso:  [...new Set([...(existing.seeAlso ?? []), ...(topic.seeAlso ?? [])])],
				})
			}
		}
	}

	return Array.from(seen.values())
}

export function groupByCategory(topics: RawTopic[]): Map<string, RawTopic[]> {
	const groups = new Map<string, RawTopic[]>()
	for (const topic of topics) {
		const list = groups.get(topic.category) ?? []
		list.push(topic)
		groups.set(topic.category, list)
	}
	return groups
}
