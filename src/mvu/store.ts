// src/mvu/store.ts
import { Subject, combineLatest, of } from 'rxjs'
import { scan, startWith, shareReplay, map, distinctUntilChanged, filter } from 'rxjs'
import { reducer } from './reducer'
import { initialState } from './model'
import { operators } from '../curriculum/index'
import type { Action } from './actions'

export const action$ = new Subject<Action>()

export const state$ = action$.pipe(
	scan(reducer, initialState),
	startWith(initialState),
	shareReplay(1),
)

// ofType — narrows and filters the action stream to a single action type
export const ofType = <K extends Action['type']>(type: K) =>
	filter((a: Action): a is Extract<Action, { type: K }> => a.type === type)

// Derived streams
export const selectedOperator$ = state$.pipe(
	map(s => s.selectedOperator),
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

export const filteredOperators$ = combineLatest([of(operators), searchQuery$]).pipe(
	map(([ops, q]) => q
		? ops.filter(op =>
				op.name.toLowerCase().includes(q.toLowerCase()) ||
				op.tags.some(t => t.includes(q.toLowerCase()))
			)
		: ops
	),
)
