// src/views/reference.ts
import type { Topic, TutorConfig } from '../curriculum/types'
import { action$ } from '../mvu/store'
import { navigateTo } from '../router'

function escapeHtml(s: string): string {
	return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

function renderEmpty(config: TutorConfig): string {
	return `<div class="reference-empty">
    <p>Select a ${escapeHtml(config.labels.topic.toLowerCase())} from the sidebar to get started.</p>
  </div>`
}

function renderExamples(topic: Topic): string {
	if (!topic.examples.length) return ''
	const items = topic.examples.map(ex => `
    <div class="reference-example">
      <div class="reference-example__title">${escapeHtml(ex.title)}</div>
      <pre class="reference-code"><code>${escapeHtml(ex.content)}</code></pre>
    </div>
  `).join('')
	return `<div class="reference-section">
    <div class="reference-label">Examples</div>
    ${items}
  </div>`
}

function renderSeeAlso(topic: Topic): string {
	if (!topic.seeAlso?.length) return ''
	const chips = topic.seeAlso.map(name =>
		`<span class="reference-chip" data-seealso="${escapeHtml(name)}">${escapeHtml(name)}</span>`
	).join('')
	return `<div class="reference-section">
    <div class="reference-label">See also</div>
    <div class="reference-chips">${chips}</div>
  </div>`
}

function renderMeta(meta: Record<string, string>): string {
	return Object.entries(meta).map(([k, v]) => `
    <div class="reference-section">
      <div class="reference-label">${escapeHtml(k)}</div>
      <p>${escapeHtml(v)}</p>
    </div>
  `).join('')
}

export function renderReference(
	topic:     Topic | null,
	config:    TutorConfig,
	allTopics: Topic[],
): void {
	const el = document.getElementById('reference')!

	if (!topic) { el.innerHTML = renderEmpty(config); return }

	el.innerHTML = `
    <div class="reference-header">
      <div class="reference-family">${escapeHtml(topic.category)}</div>
      <h1 class="reference-name">${escapeHtml(topic.name)}</h1>
      ${topic.definition ? `<div class="reference-signature"><code>${escapeHtml(topic.definition)}</code></div>` : ''}
    </div>

    <div class="reference-section">
      <div class="reference-label">Description</div>
      <p class="reference-description">${escapeHtml(topic.description)}</p>
    </div>

    ${topic.visual ? `
    <div class="reference-section">
      <div class="reference-label">${escapeHtml(config.labels.visual ?? 'Diagram')}</div>
      <pre class="reference-marble">${escapeHtml(topic.visual)}</pre>
    </div>` : ''}

    ${renderExamples(topic)}

    ${topic.meta ? renderMeta(topic.meta) : ''}

    ${renderSeeAlso(topic)}
  `

	el.querySelectorAll<HTMLElement>('[data-seealso]').forEach(chip => {
		chip.addEventListener('click', () => {
			const name   = chip.dataset.seealso!
			const target = allTopics.find(t => t.name === name)
			if (target) {
				action$.next({ type: 'TOPIC_SELECTED', topic: target })
				navigateTo(target.category, target.name)
			}
		})
	})
}
