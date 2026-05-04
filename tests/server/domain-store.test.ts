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
