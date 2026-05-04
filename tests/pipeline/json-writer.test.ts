// tests/pipeline/json-writer.test.ts

import { describe, test, expect, afterEach } from 'vitest'
import { mkdtempSync, rmSync, readFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { writeCurriculumJson } from '../../pipeline/json-writer'
import type { RawTopic } from '../../pipeline/types'
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
