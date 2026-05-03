// src/router.ts
import { fromEvent, startWith, EMPTY, Subscription } from 'rxjs'
import { map, distinctUntilChanged } from 'rxjs'
import { topics } from './curriculum/index'
import { action$ } from './mvu/store'
import type { TutorConfig } from './curriculum/types'

export interface Route {
	category:    string | null
	topic:       string | null
	searchQuery: string | null
}

export function parseRoute(pathname: string): Route {
	const url         = new URL(pathname, 'http://x')
	const searchQuery = url.searchParams.get('q')
	const parts       = url.pathname.split('/').filter(Boolean)

	return {
		category:    parts[0] ?? null,
		topic:       parts[1] ?? null,
		searchQuery,
	}
}

export function navigateTo(category: string, topicName: string): void {
	const path = `/${category.toLowerCase()}/${topicName}`
	window.history.pushState({}, '', path)
}

const isBrowser = typeof window !== 'undefined'

export const route$ = isBrowser
	? fromEvent(window, 'popstate').pipe(
		startWith(null),
		map(() => parseRoute(window.location.pathname)),
		distinctUntilChanged((a, b) =>
			a.category === b.category && a.topic === b.topic && a.searchQuery === b.searchQuery
		),
	)
	: EMPTY

export function initRouter(config: TutorConfig): Subscription {
	return route$.subscribe(route => {
		if (route.searchQuery !== null) {
			action$.next({ type: 'SEARCH_CHANGED', query: route.searchQuery })
			return
		}
		if (route.topic && route.category) {
			const t = topics.find(
				t => t.name === route.topic &&
				     t.category.toLowerCase() === route.category!.toLowerCase()
			)
			if (t) action$.next({ type: 'TOPIC_SELECTED', topic: t })
		}
		if (!route.category && !route.topic) {
			const defaultTopic = topics.find(
				t => t.name === config.defaultTopic &&
					 t.category.toLowerCase() === config.defaultCategory.toLowerCase()
			)
			if (defaultTopic) {
				action$.next({ type: 'TOPIC_SELECTED', topic: defaultTopic })
				navigateTo(defaultTopic.category, defaultTopic.name)
			}
		}
	})
}
