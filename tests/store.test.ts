// tests/store.test.ts
import { describe, test, expect } from 'vitest'
import { Subject } from 'rxjs'
import { scan, startWith, shareReplay, map, distinctUntilChanged, combineLatest, of } from 'rxjs'
import type { Action } from '../src/mvu/actions'
import { initialState } from '../src/mvu/model'
import { reducer } from '../src/mvu/reducer'
import type { Topic } from '../src/curriculum/types'

function makeStore(testTopics: Topic[]) {
	const action$ = new Subject<Action>()
	const state$  = action$.pipe(
		scan(reducer, initialState),
		startWith(initialState),
		shareReplay(1),
	)
	const searchQuery$    = state$.pipe(map(s => s.searchQuery), distinctUntilChanged())
	const selectedTopic$  = state$.pipe(map(s => s.selectedTopic), distinctUntilChanged())
	const filteredTopics$ = combineLatest([of(testTopics), searchQuery$]).pipe(
		map(([ts, q]) => q
			? ts.filter(t =>
					t.name.toLowerCase().includes(q.toLowerCase()) ||
					t.tags.some(tag => tag.includes(q.toLowerCase()))
				)
			: ts
		),
	)
	return { action$, state$, searchQuery$, selectedTopic$, filteredTopics$ }
}

function mockTopic(name: string, tags: string[] = []): Topic {
	return { name, category: 'Transformation', definition: '', description: '', visual: '', examples: [], seeAlso: [], tags }
}

describe('store', () => {
	test('filteredTopics$ returns all topics when query is empty', () => {
		const ts    = [mockTopic('switchMap'), mockTopic('mergeMap')]
		const store = makeStore(ts)
		const emitted: Topic[][] = []
		store.filteredTopics$.subscribe(v => emitted.push(v))
		expect(emitted[0]).toHaveLength(2)
	})

	test('filteredTopics$ filters by topic name', () => {
		const ts    = [mockTopic('switchMap'), mockTopic('mergeMap')]
		const store = makeStore(ts)
		const emitted: Topic[][] = []
		store.filteredTopics$.subscribe(v => emitted.push(v))
		store.action$.next({ type: 'SEARCH_CHANGED', query: 'switch' })
		expect(emitted[emitted.length - 1]).toHaveLength(1)
		expect(emitted[emitted.length - 1][0].name).toBe('switchMap')
	})

	test('filteredTopics$ filters by tag', () => {
		const ts    = [mockTopic('switchMap', ['cancellation']), mockTopic('mergeMap', ['concurrent'])]
		const store = makeStore(ts)
		const emitted: Topic[][] = []
		store.filteredTopics$.subscribe(v => emitted.push(v))
		store.action$.next({ type: 'SEARCH_CHANGED', query: 'cancellation' })
		expect(emitted[emitted.length - 1]).toHaveLength(1)
		expect(emitted[emitted.length - 1][0].name).toBe('switchMap')
	})

	test('selectedTopic$ emits null initially', () => {
		const store = makeStore([])
		let last: Topic | null = undefined as unknown as Topic | null
		store.selectedTopic$.subscribe(v => (last = v))
		expect(last).toBeNull()
	})
})
