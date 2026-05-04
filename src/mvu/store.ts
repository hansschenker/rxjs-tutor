// src/mvu/store.ts
import { Subject, combineLatest } from 'rxjs'
import { scan, startWith, shareReplay, map, distinctUntilChanged, filter } from 'rxjs'
import { reducer }      from './reducer'
import { initialState } from './model'
import type { Action }     from './actions'

export const action$ = new Subject<Action>()

export const state$ = action$.pipe(
	scan(reducer, initialState),
	startWith(initialState),
	shareReplay(1),
)

export const ofType = <K extends Action['type']>(type: K) =>
	filter((a: Action): a is Extract<Action, { type: K }> => a.type === type)

export const selectedTopic$ = state$.pipe(
	map(s => s.selectedTopic),
	distinctUntilChanged(),
)

export const searchQuery$ = state$.pipe(
	map(s => s.searchQuery),
	distinctUntilChanged(),
)

export const chatState$ = state$.pipe(
	map(s => s.chat),
	distinctUntilChanged(),
)

export const sidebarExpanded$ = state$.pipe(
	map(s => s.sidebarExpanded),
	distinctUntilChanged(),
)

export const topics$ = state$.pipe(
	map(s => s.topics),
	distinctUntilChanged(),
)

export const families$ = state$.pipe(
	map(s => s.families),
	distinctUntilChanged(),
)

export const tutorConfig$ = state$.pipe(
	map(s => s.tutorConfig),
	distinctUntilChanged(),
)

export const curriculumStatus$ = state$.pipe(
	map(s => s.curriculumStatus),
	distinctUntilChanged(),
)

export const filteredTopics$ = combineLatest([topics$, searchQuery$]).pipe(
	map(([ts, q]) => q
		? ts.filter(t =>
				t.name.toLowerCase().includes(q.toLowerCase()) ||
				t.tags.some(tag => tag.includes(q.toLowerCase()))
			)
		: ts
	),
)
