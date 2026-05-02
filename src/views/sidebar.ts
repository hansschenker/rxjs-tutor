// src/views/sidebar.ts
import type { Operator, OperatorFamily } from '../curriculum/types'
import type { AppState } from '../mvu/model'
import { families } from '../curriculum/index'
import { action$ } from '../mvu/store'
import { navigateTo } from '../router'

let keyListenerRegistered = false

function escapeHtml(s: string): string {
	return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

function renderFamilyItem(
	family: OperatorFamily,
	ops: Operator[],
	expanded: Set<OperatorFamily>,
	selected: Operator | null,
): string {
	const isExpanded = expanded.has(family)
	const operatorItems = ops
		.filter(o => o.family === family)
		.map(o => {
			const isActive = selected?.name === o.name && selected?.family === o.family
			return `<span
			class="sidebar-operator ${isActive ? 'sidebar-operator--active' : ''}"
			data-op-name="${escapeHtml(o.name)}"
			data-op-family="${escapeHtml(o.family)}"
		>${escapeHtml(o.name)}</span>`
		}).join('')

	return `<div class="sidebar-family">
		<div class="sidebar-family__header" data-toggle-family="${escapeHtml(family)}">
			<span class="sidebar-family__arrow">${isExpanded ? '▾' : '▸'}</span>
			${escapeHtml(family)}
		</div>
		${isExpanded ? `<div class="sidebar-family__operators">${operatorItems}</div>` : ''}
	</div>`
}

export function renderSidebar(filteredOps: Operator[], state: AppState): void {
	const el = document.getElementById('sidebar')!

	el.innerHTML = `
		<div class="sidebar-brand">RxJS Tutor</div>
		<input
			id="sidebar-search"
			class="sidebar-search"
			type="text"
			placeholder="Search operators… ⌘K"
			value="${escapeHtml(state.searchQuery)}"
			autocomplete="off"
		>
		<div class="sidebar-section-label">Families</div>
		<div class="sidebar-families">
			${families.map(f =>
				renderFamilyItem(f.name, filteredOps, state.sidebarExpanded, state.selectedOperator)
			).join('')}
		</div>
	`

	// Search input
	const input = el.querySelector<HTMLInputElement>('#sidebar-search')!
	input.addEventListener('input', () =>
		action$.next({ type: 'SEARCH_CHANGED', query: input.value })
	)
	// ⌘K / Ctrl+K global shortcut
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

	// Family toggle
	el.querySelectorAll<HTMLElement>('[data-toggle-family]').forEach(header => {
		header.addEventListener('click', () =>
			action$.next({ type: 'FAMILY_TOGGLED', family: header.dataset.toggleFamily as OperatorFamily })
		)
	})

	// Operator click
	el.querySelectorAll<HTMLElement>('[data-op-name]').forEach(span => {
		span.addEventListener('click', () => {
			const name   = span.dataset.opName!
			const family = span.dataset.opFamily as OperatorFamily
			const op     = filteredOps.find(o => o.name === name && o.family === family)
			if (op) {
				action$.next({ type: 'OPERATOR_SELECTED', operator: op })
				navigateTo(family, name)
			}
		})
	})
}
