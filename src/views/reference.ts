// src/views/reference.ts
import type { Operator } from '../curriculum/types'
import { action$ } from '../mvu/store'
import { operators } from '../curriculum/index'
import { navigateTo } from '../router'

function escapeHtml(s: string): string {
	return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

function renderEmpty(): string {
	return `<div class="reference-empty">
    <p>Select an operator from the sidebar to get started.</p>
  </div>`
}

function renderExamples(op: Operator): string {
	if (!op.examples.length) return ''
	return op.examples.map(ex => `
    <div class="reference-example">
      <div class="reference-example__title">${escapeHtml(ex.title)}</div>
      <pre class="reference-code"><code>${escapeHtml(ex.code)}</code></pre>
    </div>
  `).join('')
}

function renderSeeAlso(op: Operator): string {
	if (!op.seeAlso.length) return ''
	const chips = op.seeAlso.map(name =>
		`<span class="reference-chip" data-seealso="${escapeHtml(name)}">${escapeHtml(name)}</span>`
	).join('')
	return `<div class="reference-section">
    <div class="reference-label">See also</div>
    <div class="reference-chips">${chips}</div>
  </div>`
}

export function renderReference(op: Operator | null): void {
	const el = document.getElementById('reference')!

	if (!op) { el.innerHTML = renderEmpty(); return }

	el.innerHTML = `
    <div class="reference-header">
      <div class="reference-family">${escapeHtml(op.family)}</div>
      <h1 class="reference-name">${escapeHtml(op.name)}</h1>
      ${op.signature ? `<div class="reference-signature"><code>${escapeHtml(op.signature)}</code></div>` : ''}
    </div>

    <div class="reference-section">
      <div class="reference-label">Description</div>
      <p class="reference-description">${escapeHtml(op.description)}</p>
    </div>

    ${op.marble ? `
    <div class="reference-section">
      <div class="reference-label">Marble diagram</div>
      <pre class="reference-marble">${escapeHtml(op.marble)}</pre>
    </div>` : ''}

    <div class="reference-section">
      <div class="reference-label">Examples</div>
      ${renderExamples(op)}
    </div>

    ${renderSeeAlso(op)}
  `

	// Wire see-also chips
	el.querySelectorAll<HTMLElement>('[data-seealso]').forEach(chip => {
		chip.addEventListener('click', () => {
			const name   = chip.dataset.seealso!
			const target = operators.find(o => o.name === name)
			if (target) {
				action$.next({ type: 'OPERATOR_SELECTED', operator: target })
				navigateTo(target.family, target.name)
			}
		})
	})
}
