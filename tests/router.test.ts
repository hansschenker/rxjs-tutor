// tests/router.test.ts
import { describe, test, expect } from 'vitest'
import { parseRoute } from '../src/router'

describe('parseRoute', () => {
	test('parses category + topic route', () => {
		const r = parseRoute('/transformation/switchMap')
		expect(r.category).toBe('transformation')
		expect(r.topic).toBe('switchMap')
	})

	test('parses category-only route', () => {
		const r = parseRoute('/creation')
		expect(r.category).toBe('creation')
		expect(r.topic).toBeNull()
	})

	test('parses root route', () => {
		const r = parseRoute('/')
		expect(r.category).toBeNull()
		expect(r.topic).toBeNull()
	})

	test('extracts search query', () => {
		const r = parseRoute('/search?q=cancel')
		expect(r.searchQuery).toBe('cancel')
	})
})
