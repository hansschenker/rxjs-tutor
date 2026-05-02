// src/router.ts
import { fromEvent, startWith, EMPTY } from 'rxjs'
import { map, distinctUntilChanged } from 'rxjs'
import { operators } from './curriculum/index'
import { action$ } from './mvu/store'

export interface Route {
	family:      string | null
	operator:    string | null
	searchQuery: string | null
}

export function parseRoute(pathname: string): Route {
	const url         = new URL(pathname, 'http://x')
	const searchQuery = url.searchParams.get('q')
	const parts       = url.pathname.split('/').filter(Boolean)

	return {
		family:      parts[0] ?? null,
		operator:    parts[1] ?? null,
		searchQuery,
	}
}

export function navigateTo(family: string, operatorName: string): void {
	const path = `/${family.toLowerCase()}/${operatorName}`
	window.history.pushState({}, '', path)
}

// Guard window access so the module can be imported in non-browser environments
const isBrowser = typeof window !== 'undefined'

export const route$ = isBrowser
	? fromEvent(window, 'popstate').pipe(
		startWith(null),
		map(() => parseRoute(window.location.pathname)),
		distinctUntilChanged((a, b) =>
			a.family === b.family && a.operator === b.operator && a.searchQuery === b.searchQuery
		),
	)
	: EMPTY

export function initRouter(): void {
	route$.subscribe(route => {
		if (route.searchQuery !== null) {
			action$.next({ type: 'SEARCH_CHANGED', query: route.searchQuery })
			return
		}
		if (route.operator && route.family) {
			const op = operators.find(
				o => o.name === route.operator &&
				     o.family.toLowerCase() === route.family!.toLowerCase()
			)
			if (op) action$.next({ type: 'OPERATOR_SELECTED', operator: op })
		}
		// Default: navigate to first Transformation operator when at root
		if (!route.family && !route.operator) {
			const defaultOp = operators.find(o => o.family === 'Transformation')
			if (defaultOp) navigateTo('transformation', defaultOp.name)
		}
	})
}
