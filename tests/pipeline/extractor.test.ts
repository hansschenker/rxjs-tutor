// tests/pipeline/extractor.test.ts

import { describe, test, expect, vi } from 'vitest'
import { extractTopics } from '../../pipeline/extractor'
import type { SourceDocument, PipelineConfig } from '../../pipeline/types'
import type Anthropic from '@anthropic-ai/sdk'

const mockConfig: PipelineConfig = {
	domain: {
		name:            'Test',
		description:     'Test domain',
		defaultCategory: 'Cat A',
		defaultTopic:    'topic1',
		labels: { category: 'Module', topic: 'Concept' },
	},
	extraction: { model: 'claude-haiku-4-5-20251001', maxChunkChars: 1000 },
	output: { dir: 'test-output' },
}

const mockDoc: SourceDocument = { filename: 'test.md', content: '# Test\n## Concept A' }

function makeClient(toolInput: unknown): Anthropic {
	return {
		messages: {
			create: vi.fn().mockResolvedValue({
				content: [{
					type:  'tool_use',
					name:  'extract_topics',
					input: toolInput,
				}],
			}),
		},
	} as unknown as Anthropic
}

describe('extractTopics', () => {
	test('returns topics from a valid tool_use response', async () => {
		const client = makeClient({
			topics: [{
				name:        'Concept A',
				category:    'Cat A',
				description: 'Description of A',
				examples:    [{ title: 'Example 1', content: 'code here' }],
				tags:        ['tag1'],
				seeAlso:     ['Concept B'],
			}],
		})
		const result = await extractTopics(mockDoc, mockConfig, client)
		expect(result.sourceFile).toBe('test.md')
		expect(result.topics).toHaveLength(1)
		expect(result.topics[0].name).toBe('Concept A')
		expect(result.topics[0].examples![0].content).toBe('code here')
		expect(result.topics[0].seeAlso).toEqual(['Concept B'])
	})

	test('returns empty topics when response has no tool_use block', async () => {
		const client = {
			messages: {
				create: vi.fn().mockResolvedValue({
					content: [{ type: 'text', text: 'I cannot help with that.' }],
				}),
			},
		} as unknown as Anthropic
		const result = await extractTopics(mockDoc, mockConfig, client)
		expect(result.topics).toHaveLength(0)
	})

	test('filters out raw items that are not valid topics', async () => {
		const client = makeClient({
			topics: [
				{ name: 'Valid', category: 'Cat A', description: 'ok', examples: [], tags: [] },
				{ name: 42,      category: 'Cat A', description: 'bad name' },
				null,
				'string instead of object',
			],
		})
		const result = await extractTopics(mockDoc, mockConfig, client)
		expect(result.topics).toHaveLength(1)
		expect(result.topics[0].name).toBe('Valid')
	})

	test('fills in missing optional fields with defaults', async () => {
		const client = makeClient({
			topics: [{ name: 'Minimal', category: 'Cat A', description: 'Only required fields' }],
		})
		const result = await extractTopics(mockDoc, mockConfig, client)
		expect(result.topics[0].definition).toBe('')
		expect(result.topics[0].visual).toBe('')
		expect(result.topics[0].examples).toEqual([])
		expect(result.topics[0].tags).toEqual([])
		expect(result.topics[0].seeAlso).toEqual([])
	})
})
