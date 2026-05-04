// tests/pipeline/merger.test.ts

import { describe, test, expect } from 'vitest'
import { mergeTopics, groupByCategory } from '../../pipeline/merger'
import type { ExtractionResult, RawTopic } from '../../pipeline/types'

function mockRaw(name: string, category = 'Module A', extras: Partial<RawTopic> = {}): RawTopic {
	return {
		name,
		category,
		description: `${name} description`,
		examples:    [],
		tags:        [],
		seeAlso:     [],
		...extras,
	}
}

describe('mergeTopics', () => {
	test('keeps unique topics across results', () => {
		const results: ExtractionResult[] = [
			{ sourceFile: 'a.md', topics: [mockRaw('Partial'), mockRaw('Required')] },
			{ sourceFile: 'b.md', topics: [mockRaw('Readonly')] },
		]
		const merged = mergeTopics(results)
		expect(merged).toHaveLength(3)
		expect(merged.map(t => t.name)).toEqual(expect.arrayContaining(['Partial', 'Required', 'Readonly']))
	})

	test('deduplicates topics by name case-insensitively', () => {
		const results: ExtractionResult[] = [
			{ sourceFile: 'a.md', topics: [mockRaw('partial')] },
			{ sourceFile: 'b.md', topics: [mockRaw('Partial')] },
		]
		expect(mergeTopics(results)).toHaveLength(1)
	})

	test('merges examples from duplicates, skipping same title', () => {
		const t1 = mockRaw('Partial', 'M', {
			examples: [{ title: 'Basic', content: 'type P = Partial<T>' }],
		})
		const t2 = mockRaw('partial', 'M', {
			examples: [
				{ title: 'Basic',         content: 'type P = Partial<T>' },
				{ title: 'With Interface', content: 'type P = Partial<User>' },
			],
		})
		const merged = mergeTopics([
			{ sourceFile: 'a.md', topics: [t1] },
			{ sourceFile: 'b.md', topics: [t2] },
		])
		expect(merged[0].examples).toHaveLength(2)
		expect(merged[0].examples![1].title).toBe('With Interface')
	})

	test('merges tags from duplicates without repetition', () => {
		const t1 = mockRaw('Partial', 'M', { tags: ['optional', 'utility'] })
		const t2 = mockRaw('Partial', 'M', { tags: ['utility', 'mapped'] })
		const merged = mergeTopics([
			{ sourceFile: 'a.md', topics: [t1] },
			{ sourceFile: 'b.md', topics: [t2] },
		])
		expect(new Set(merged[0].tags)).toEqual(new Set(['optional', 'utility', 'mapped']))
	})

	test('merges seeAlso from duplicates without repetition', () => {
		const t1 = mockRaw('Partial', 'M', { seeAlso: ['Required'] })
		const t2 = mockRaw('Partial', 'M', { seeAlso: ['Required', 'Readonly'] })
		const merged = mergeTopics([
			{ sourceFile: 'a.md', topics: [t1] },
			{ sourceFile: 'b.md', topics: [t2] },
		])
		expect(new Set(merged[0].seeAlso)).toEqual(new Set(['Required', 'Readonly']))
	})
})

describe('groupByCategory', () => {
	test('groups topics by category', () => {
		const topics = [
			mockRaw('Partial',  'Utility Types'),
			mockRaw('Required', 'Utility Types'),
			mockRaw('identity', 'Generics'),
		]
		const groups = groupByCategory(topics)
		expect(groups.get('Utility Types')).toHaveLength(2)
		expect(groups.get('Generics')).toHaveLength(1)
	})

	test('preserves insertion order within a category', () => {
		const topics = [
			mockRaw('Partial',  'M'),
			mockRaw('Required', 'M'),
			mockRaw('Readonly', 'M'),
		]
		const list = groupByCategory(topics).get('M')!
		expect(list.map(t => t.name)).toEqual(['Partial', 'Required', 'Readonly'])
	})
})
