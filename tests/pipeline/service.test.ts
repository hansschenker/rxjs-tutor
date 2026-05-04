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
