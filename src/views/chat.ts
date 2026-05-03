// src/views/chat.ts
import type { ChatState } from '../mvu/model'
import type { Topic, TutorConfig } from '../curriculum/types'
import { action$ } from '../mvu/store'

function escapeHtml(s: string): string {
	return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

export function renderChat(chat: ChatState, topic: Topic | null, config: TutorConfig): void {
	const el = document.getElementById('chat')!

	const headerLabel = topic
		? `🤖 ${escapeHtml(config.domainName)} Tutor · <span class="chat-header__op">${escapeHtml(topic.name)}</span>`
		: `🤖 ${escapeHtml(config.domainName)} Tutor`

	const messages = chat.history.map(m => `
		<div class="chat-message chat-message--${m.role}">
			${escapeHtml(m.content)}
		</div>
	`).join('')

	el.innerHTML = `
		<div class="chat-header">${headerLabel}</div>
		<div class="chat-messages" id="chat-messages">
			${topic && chat.history.length === 0
				? `<div class="chat-welcome">Hi! I'm your ${escapeHtml(config.domainName)} tutor. You're looking at <strong>${escapeHtml(topic.name)}</strong>. What would you like to understand about it?</div>`
				: messages
			}
			${chat.loading ? '<div class="chat-typing">…</div>' : ''}
			${chat.error ? `<div class="chat-error">${escapeHtml(chat.error)}</div>` : ''}
		</div>
		<div class="chat-input-row">
			<input
				id="chat-input"
				class="chat-input"
				type="text"
				placeholder="Ask about ${topic ? escapeHtml(topic.name) : 'a ' + escapeHtml(config.labels.topic.toLowerCase())}…"
				${!topic ? 'disabled' : ''}
				autocomplete="off"
			>
			<button
				id="chat-send"
				class="chat-send"
				${!topic || chat.loading ? 'disabled' : ''}
			>Send</button>
		</div>
	`

	wireInput()
	scrollToBottom()
}

export function appendChatChunk(chunk: string): void {
	const messages = document.getElementById('chat-messages')
	if (!messages) return
	const typing = messages.querySelector('.chat-typing')
	if (typing) typing.remove()

	let last = messages.querySelector<HTMLElement>('.chat-message--assistant:last-child')
	if (!last) {
		last = document.createElement('div')
		last.className = 'chat-message chat-message--assistant'
		messages.appendChild(last)
	}
	last.textContent = (last.textContent ?? '') + chunk
	scrollToBottom()
}

function wireInput(): void {
	const input  = document.getElementById('chat-input') as HTMLInputElement | null
	const button = document.getElementById('chat-send') as HTMLButtonElement | null
	if (!input || !button) return

	function sendMessage(): void {
		const content = input!.value.trim()
		if (!content) return
		action$.next({ type: 'CHAT_MESSAGE_SENT', content })
		input!.value = ''
	}

	button.addEventListener('click', sendMessage)
	input.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage() })
}

function scrollToBottom(): void {
	const el = document.getElementById('chat-messages')
	if (el) el.scrollTop = el.scrollHeight
}
