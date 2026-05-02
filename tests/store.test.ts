// tests/store.test.ts
import { describe, test, expect } from 'vitest'
import { Subject } from 'rxjs'
import { scan, startWith, shareReplay, map, distinctUntilChanged } from 'rxjs'
import { combineLatest, of } from 'rxjs'
import type { Action } from '../src/mvu/actions'
import { initialState } from '../src/mvu/model'
import { reducer } from '../src/mvu/reducer'
import type { Operator } from '../src/curriculum/types'

// Re-create store logic locally to test in isolation (avoids importing the real store which has side effects)
function makeStore(testOps: Operator[]) {
	const action$ = new Subject<Action>()
	const state$  = action$.pipe(
		scan(reducer, initialState),
		startWith(initialState),
		shareReplay(1),
	)
	const searchQuery$      = state$.pipe(map(s => s.searchQuery), distinctUntilChanged())
	const selectedOperator$ = state$.pipe(map(s => s.selectedOperator), distinctUntilChanged())
	const filteredOperators$ = combineLatest([of(testOps), searchQuery$]).pipe(
		map(([ops, q]) => q
			? ops.filter(op =>
					op.name.toLowerCase().includes(q.toLowerCase()) ||
					op.tags.some(t => t.includes(q.toLowerCase()))
				)
			: ops
		),
	)
	return { action$, state$, searchQuery$, selectedOperator$, filteredOperators$ }
}

function mockOp(name: string, tags: string[] = []): Operator {
	return { name, family: 'Transformation', signature: '', description: '', marble: '', examples: [], seeAlso: [], tags }
}

describe('store', () => {
	test('filteredOperators$ returns all ops when query is empty', () => {
		const ops   = [mockOp('switchMap'), mockOp('mergeMap')]
		const store = makeStore(ops)
		const emitted: Operator[][] = []
		store.filteredOperators$.subscribe(v => emitted.push(v))
		expect(emitted[0]).toHaveLength(2)
	})

	test('filteredOperators$ filters by operator name', () => {
		const ops   = [mockOp('switchMap'), mockOp('mergeMap')]
		const store = makeStore(ops)
		const emitted: Operator[][] = []
		store.filteredOperators$.subscribe(v => emitted.push(v))
		store.action$.next({ type: 'SEARCH_CHANGED', query: 'switch' })
		expect(emitted[emitted.length - 1]).toHaveLength(1)
		expect(emitted[emitted.length - 1][0].name).toBe('switchMap')
	})

	test('filteredOperators$ filters by tag', () => {
		const ops   = [mockOp('switchMap', ['cancellation']), mockOp('mergeMap', ['concurrent'])]
		const store = makeStore(ops)
		const emitted: Operator[][] = []
		store.filteredOperators$.subscribe(v => emitted.push(v))
		store.action$.next({ type: 'SEARCH_CHANGED', query: 'cancellation' })
		expect(emitted[emitted.length - 1]).toHaveLength(1)
		expect(emitted[emitted.length - 1][0].name).toBe('switchMap')
	})

	test('selectedOperator$ emits null initially', () => {
		const store = makeStore([])
		let last: Operator | null = undefined as unknown as Operator | null
		store.selectedOperator$.subscribe(v => (last = v))
		expect(last).toBeNull()
	})
})
