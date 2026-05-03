// src/main.ts
import './style.css'
import { combineLatest, filter } from 'rxjs'
import { withLatestFrom } from 'rxjs'
import { action$, state$, filteredTopics$, selectedTopic$, chatState$, ofType } from './mvu/store'
import { renderSidebar } from './views/sidebar'
import { renderReference } from './views/reference'
import { renderChat, appendChatChunk } from './views/chat'
import { chatEffect$ } from './effects/chat.effects'
import { initRouter } from './router'
import { config } from './tutor.config'

// ── Sidebar ──────────────────────────────────────────────────────────
combineLatest([filteredTopics$, state$]).subscribe(
	([ts, state]) => renderSidebar(ts, state, config)
)

// ── Reference panel ──────────────────────────────────────────────────
selectedTopic$.subscribe(t => renderReference(t, config))

// ── Chat panel ───────────────────────────────────────────────────────
action$.pipe(
	filter(a => ['TOPIC_SELECTED', 'CHAT_MESSAGE_SENT', 'CHAT_RESPONSE_COMPLETE', 'CHAT_ERROR'].includes(a.type)),
	withLatestFrom(combineLatest([chatState$, selectedTopic$]))
).subscribe(([_action, [chat, t]]) => renderChat(chat, t, config))

action$.pipe(ofType('CHAT_CHUNK_RECEIVED')).subscribe(a => appendChatChunk(a.chunk))

// ── Effects ───────────────────────────────────────────────────────────
chatEffect$.subscribe(action$)

// ── Router ────────────────────────────────────────────────────────────
initRouter(config)
