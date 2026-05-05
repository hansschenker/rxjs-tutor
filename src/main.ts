// src/main.ts
import './style.css'
import { combineLatest, filter, take, withLatestFrom } from 'rxjs'
import {
	action$, state$, filteredTopics$, families$,
	selectedTopic$, chatState$, tutorConfig$, curriculumStatus$, topics$, ofType,
} from './mvu/store'
import { renderSidebar }               from './views/sidebar'
import { renderReference }             from './views/reference'
import { renderChat, appendChatChunk } from './views/chat'
import { chatEffect$ }                 from './effects/chat.effects'
import { fetchCurriculum }             from './effects/curriculum.effects'
import { initRouter }                  from './router'
import type { TutorConfig }            from './curriculum/types'

// ── Curriculum fetch ──────────────────────────────────────────────────
fetchCurriculum('rxjs').subscribe({ next: a => action$.next(a) })

// ── Loading overlay ───────────────────────────────────────────────────
curriculumStatus$.subscribe(status => {
	const loading = document.getElementById('loading')
	const app     = document.getElementById('app')
	if (loading) loading.style.display = status === 'ready' ? 'none' : 'flex'
	if (app)     app.style.display     = status === 'ready' ? 'grid' : 'none'
	if (status === 'error') {
		if (loading) loading.textContent = 'Failed to load curriculum. Is the server running?'
	}
})

const config$ = tutorConfig$.pipe(filter((c): c is TutorConfig => c !== null))

// ── Sidebar ──────────────────────────────────────────────────────────
combineLatest([filteredTopics$, families$, state$, config$]).subscribe(
	([ts, fam, state, config]) => renderSidebar(ts, fam, state, config)
)

// ── Reference panel ──────────────────────────────────────────────────
combineLatest([config$, topics$]).pipe(take(1)).subscribe(
	([config, allTopics]) => renderReference(null, config, allTopics)
)
action$.pipe(
	ofType('TOPIC_SELECTED'),
	withLatestFrom(combineLatest([config$, topics$]))
).subscribe(([a, [config, allTopics]]) => renderReference(a.topic, config, allTopics))

// ── Chat panel ───────────────────────────────────────────────────────
action$.pipe(
	filter(a => ['TOPIC_SELECTED', 'CHAT_MESSAGE_SENT', 'CHAT_RESPONSE_COMPLETE', 'CHAT_ERROR'].includes(a.type)),
	withLatestFrom(combineLatest([chatState$, selectedTopic$, config$]))
).subscribe(([_action, [chat, t, config]]) => renderChat(chat, t, config))

action$.pipe(ofType('CHAT_CHUNK_RECEIVED')).subscribe(a => appendChatChunk(a.chunk))

// ── Effects ───────────────────────────────────────────────────────────
chatEffect$.subscribe({ next: a => action$.next(a) })

// ── Router ────────────────────────────────────────────────────────────
const routerSub = combineLatest([config$, state$.pipe(filter(s => s.topics.length > 0))]).pipe(
	take(1),
).subscribe(([config, state]) => {
	routerSub.add(initRouter(config, state.topics))
})
