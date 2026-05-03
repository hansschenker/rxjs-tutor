// tests/reducer.test.ts
import { describe, test, expect } from 'vitest'
import { reducer } from '../src/mvu/reducer'
import { initialState } from '../src/mvu/model'
import type { Topic } from '../src/curriculum/types'

function mockTopic(name: string): Topic {
	return {
		name,
		category:    'Transformation',
		definition:  '',
		description: `${name} description`,
		visual:      '',
		examples:    [],
		seeAlso:     [],
		tags:        [],
	}
}

describe('reducer', () => {
	test('TOPIC_SELECTED sets topic and resets chat history', () => {
		const t     = mockTopic('switchMap')
		const state = reducer(initialState, { type: 'TOPIC_SELECTED', topic: t })
		expect(state.selectedTopic).toEqual(t)
		expect(state.selectedCategory).toBe('Transformation')
		expect(state.chat.history).toEqual([])
		expect(state.chat.loading).toBe(false)
	})

	test('CATEGORY_TOGGLED expands a collapsed category', () => {
		const state = reducer(initialState, { type: 'CATEGORY_TOGGLED', category: 'Transformation' })
		expect(state.sidebarExpanded.has('Transformation')).toBe(true)
	})

	test('CATEGORY_TOGGLED collapses an already-expanded category', () => {
		const expanded = { ...initialState, sidebarExpanded: new Set<string>(['Transformation']) }
		const state    = reducer(expanded, { type: 'CATEGORY_TOGGLED', category: 'Transformation' })
		expect(state.sidebarExpanded.has('Transformation')).toBe(false)
	})

	test('SEARCH_CHANGED updates searchQuery', () => {
		const state = reducer(initialState, { type: 'SEARCH_CHANGED', query: 'merge' })
		expect(state.searchQuery).toBe('merge')
	})

	test('CHAT_MESSAGE_SENT adds user + empty assistant message, sets loading', () => {
		const state = reducer(initialState, { type: 'CHAT_MESSAGE_SENT', content: 'What does switchMap do?' })
		expect(state.chat.history).toHaveLength(2)
		expect(state.chat.history[0]).toEqual({ role: 'user', content: 'What does switchMap do?' })
		expect(state.chat.history[1]).toEqual({ role: 'assistant', content: '' })
		expect(state.chat.loading).toBe(true)
		expect(state.chat.error).toBeNull()
	})

	test('CHAT_CHUNK_RECEIVED appends chunk to last assistant message', () => {
		const withMessages = {
			...initialState,
			chat: {
				history:  [{ role: 'user' as const, content: 'Hi' }, { role: 'assistant' as const, content: 'Hello' }],
				loading:  true,
				error:    null,
			},
		}
		const state = reducer(withMessages, { type: 'CHAT_CHUNK_RECEIVED', chunk: ' world' })
		expect(state.chat.history[1].content).toBe('Hello world')
	})

	test('CHAT_RESPONSE_COMPLETE sets loading to false', () => {
		const loading = { ...initialState, chat: { ...initialState.chat, loading: true } }
		const state   = reducer(loading, { type: 'CHAT_RESPONSE_COMPLETE' })
		expect(state.chat.loading).toBe(false)
	})

	test('CHAT_ERROR sets error and clears loading', () => {
		const loading = { ...initialState, chat: { ...initialState.chat, loading: true } }
		const state   = reducer(loading, { type: 'CHAT_ERROR', message: 'Network error' })
		expect(state.chat.error).toBe('Network error')
		expect(state.chat.loading).toBe(false)
	})
})
