// tests/router.test.ts
import { describe, test, expect } from 'vitest'
import { parseRoute } from '../src/router'

describe('parseRoute', () => {
	test('parses family + operator route', () => {
		const r = parseRoute('/transformation/switchMap')
		expect(r.family).toBe('transformation')
		expect(r.operator).toBe('switchMap')
	})

	test('parses family-only route', () => {
		const r = parseRoute('/creation')
		expect(r.family).toBe('creation')
		expect(r.operator).toBeNull()
	})

	test('parses root route', () => {
		const r = parseRoute('/')
		expect(r.family).toBeNull()
		expect(r.operator).toBeNull()
	})

	test('extracts search query', () => {
		const r = parseRoute('/search?q=cancel')
		expect(r.searchQuery).toBe('cancel')
	})
})
