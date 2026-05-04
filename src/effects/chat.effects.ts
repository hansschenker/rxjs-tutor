// src/effects/chat.effects.ts
import { Observable, of, endWith } from 'rxjs'
import { exhaustMap, withLatestFrom, map, catchError } from 'rxjs'
import { action$, ofType, state$ } from '../mvu/store'
import type { Action } from '../mvu/actions'

function streamChunks(res: Response): Observable<string> {
	return new Observable<string>(observer => {
		const reader  = res.body!.getReader()
		const decoder = new TextDecoder()
		let buffer    = ''

		async function pump(): Promise<void> {
			try {
				while (true) {
					const { done, value } = await reader.read()
					if (done) { observer.complete(); return }
					buffer += decoder.decode(value, { stream: true })
					const lines = buffer.split('\n')
					buffer = lines.pop() ?? ''
					for (const line of lines) {
						const trimmed = line.trim()
						if (!trimmed) continue
						try {
							const parsed: unknown = JSON.parse(trimmed)
							if (
								typeof parsed === 'object' &&
								parsed !== null &&
								'chunk' in parsed &&
								typeof (parsed as { chunk?: unknown }).chunk === 'string'
							) {
								observer.next((parsed as { chunk: string }).chunk)
							}
						} catch { /* skip malformed line */ }
					}
				}
			} catch (err) {
				observer.error(err)
			}
		}

		void pump()
		return () => void reader.cancel()
	})
}

export const chatEffect$ = action$.pipe(
	ofType('CHAT_MESSAGE_SENT'),
	withLatestFrom(state$),
	exhaustMap(([action, state]) => {
		if (!state.selectedTopic) return of<Action>({ type: 'CHAT_ERROR', message: 'No topic selected' })
		if (!state.tutorConfig)   return of<Action>({ type: 'CHAT_ERROR', message: 'Curriculum not loaded' })

		const tutorConfig = state.tutorConfig

		return new Observable<Action>(observer => {
			fetch('/api/chat', {
				method:  'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					topic:   state.selectedTopic,
					history: state.chat.history.slice(0, -2),
					message: action.content,
					config: {
						domainName:           tutorConfig.domainName,
						systemPromptTemplate: tutorConfig.systemPromptTemplate,
					},
				}),
			})
				.then(res => {
					if (!res.ok) throw new Error(`HTTP ${res.status}`)
					return streamChunks(res).pipe(
						map((chunk): Action => ({ type: 'CHAT_CHUNK_RECEIVED', chunk })),
						endWith<Action>({ type: 'CHAT_RESPONSE_COMPLETE' }),
						catchError(err => of<Action>({ type: 'CHAT_ERROR', message: String(err) })),
					)
				})
				.then(obs$ => obs$.subscribe(observer))
				.catch(err => {
					observer.next({ type: 'CHAT_ERROR', message: String(err) })
					observer.complete()
				})
		})
	}),
)
