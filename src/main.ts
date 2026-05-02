// src/main.ts
import './style.css'
import { combineLatest, filter } from 'rxjs'
import { withLatestFrom } from 'rxjs'
import { action$, state$, filteredOperators$, selectedOperator$, chatState$, ofType } from './mvu/store'
import { renderSidebar } from './views/sidebar'
import { renderReference } from './views/reference'
import { renderChat, appendChatChunk } from './views/chat'
import { chatEffect$ } from './effects/chat.effects'
import { initRouter } from './router'

// ── Sidebar ─────────────────────────────────────────────────────────
combineLatest([filteredOperators$, state$]).subscribe(
	([ops, state]) => renderSidebar(ops, state)
)

// ── Reference panel ─────────────────────────────────────────────────
selectedOperator$.subscribe(op => renderReference(op))

// ── Chat panel ───────────────────────────────────────────────────────
// Full re-render on structural changes
action$.pipe(
	filter(a => ['OPERATOR_SELECTED', 'CHAT_MESSAGE_SENT', 'CHAT_RESPONSE_COMPLETE', 'CHAT_ERROR'].includes(a.type)),
	withLatestFrom(combineLatest([chatState$, selectedOperator$]))
).subscribe(([_action, [chat, op]]) => renderChat(chat, op))

// In-place chunk append during streaming
action$.pipe(ofType('CHAT_CHUNK_RECEIVED')).subscribe(a => appendChatChunk(a.chunk))

// ── Effects ──────────────────────────────────────────────────────────
chatEffect$.subscribe(action$)

// ── Router ───────────────────────────────────────────────────────────
initRouter()
