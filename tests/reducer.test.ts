// tests/reducer.test.ts
import { describe, test, expect } from 'vitest'
import { reducer } from '../src/mvu/reducer'
import { initialState } from '../src/mvu/model'
import type { Operator } from '../src/curriculum/types'

function mockOperator(name: string): Operator {
	return {
		name,
		family:      'Transformation',
		signature:   '',
		description: `${name} description`,
		marble:      '',
		examples:    [],
		seeAlso:     [],
		tags:        [],
	}
}

describe('reducer', () => {
	test('OPERATOR_SELECTED sets operator and resets chat history', () => {
		const op    = mockOperator('switchMap')
		const state = reducer(initialState, { type: 'OPERATOR_SELECTED', operator: op })
		expect(state.selectedOperator).toEqual(op)
		expect(state.chat.history).toEqual([])
		expect(state.chat.loading).toBe(false)
	})

	test('FAMILY_TOGGLED expands a collapsed family', () => {
		const state = reducer(initialState, { type: 'FAMILY_TOGGLED', family: 'Transformation' })
		expect(state.sidebarExpanded.has('Transformation')).toBe(true)
	})

	test('FAMILY_TOGGLED collapses an already-expanded family', () => {
		const expanded = {
			...initialState,
			sidebarExpanded: new Set<import('../src/curriculum/types').OperatorFamily>(['Transformation']),
		}
		const state = reducer(expanded, { type: 'FAMILY_TOGGLED', family: 'Transformation' })
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
