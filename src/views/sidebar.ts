// src/views/sidebar.ts
import type { Topic, TutorConfig } from '../curriculum/types'
import type { AppState } from '../mvu/model'
import { families } from '../curriculum/index'
import { action$ } from '../mvu/store'
import { navigateTo } from '../router'

let keyListenerRegistered = false

function escapeHtml(s: string): string {
	return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

function renderFamilyItem(
	category: string,
	filteredTopics: Topic[],
	expanded: Set<string>,
	selected: Topic | null,
): string {
	const isExpanded  = expanded.has(category)
	const topicItems  = filteredTopics
		.filter(t => t.category === category)
		.map(t => {
			const isActive = selected?.name === t.name && selected?.category === t.category
			return `<span
			class="sidebar-operator ${isActive ? 'sidebar-operator--active' : ''}"
			data-op-name="${escapeHtml(t.name)}"
			data-op-category="${escapeHtml(t.category)}"
		>${escapeHtml(t.name)}</span>`
		}).join('')

	return `<div class="sidebar-family">
		<div class="sidebar-family__header" data-toggle-category="${escapeHtml(category)}">
			<span class="sidebar-family__arrow">${isExpanded ? '▾' : '▸'}</span>
			${escapeHtml(category)}
		</div>
		${isExpanded ? `<div class="sidebar-family__operators">${topicItems}</div>` : ''}
	</div>`
}

export function renderSidebar(filteredTopics: Topic[], state: AppState, config: TutorConfig): void {
	const el = document.getElementById('sidebar')!

	el.innerHTML = `
		<div class="sidebar-brand">${escapeHtml(config.domainName)} Tutor</div>
		<input
			id="sidebar-search"
			class="sidebar-search"
			type="text"
			placeholder="Search ${escapeHtml(config.labels.topic.toLowerCase())}s… ⌘K"
			value="${escapeHtml(state.searchQuery)}"
			autocomplete="off"
		>
		<div class="sidebar-section-label">${escapeHtml(config.labels.category + 's')}</div>
		<div class="sidebar-families">
			${families.map(f =>
				renderFamilyItem(f.name, filteredTopics, state.sidebarExpanded, state.selectedTopic)
			).join('')}
		</div>
	`

	const input = el.querySelector<HTMLInputElement>('#sidebar-search')!
	input.addEventListener('input', () =>
		action$.next({ type: 'SEARCH_CHANGED', query: input.value })
	)

	if (!keyListenerRegistered) {
		keyListenerRegistered = true
		document.addEventListener('keydown', e => {
			if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
				e.preventDefault()
				const searchInput = document.getElementById('sidebar-search') as HTMLInputElement | null
				if (searchInput) searchInput.focus()
			}
		})
	}

	el.querySelectorAll<HTMLElement>('[data-toggle-category]').forEach(header => {
		header.addEventListener('click', () =>
			action$.next({ type: 'CATEGORY_TOGGLED', category: header.dataset.toggleCategory! })
		)
	})

	el.querySelectorAll<HTMLElement>('[data-op-name]').forEach(span => {
		span.addEventListener('click', () => {
			const name     = span.dataset.opName!
			const category = span.dataset.opCategory!
			const t        = filteredTopics.find(t => t.name === name && t.category === category)
			if (t) {
				action$.next({ type: 'TOPIC_SELECTED', topic: t })
				navigateTo(category, name)
			}
		})
	})
}
