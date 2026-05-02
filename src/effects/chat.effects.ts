// src/effects/chat.effects.ts
import { Observable, of, endWith } from 'rxjs'
import { exhaustMap, withLatestFrom, map, catchError } from 'rxjs'
import { action$, ofType, state$ } from '../mvu/store'
import type { Action } from '../mvu/actions'

/**
 * Reads a streaming fetch Response body as NDJSON lines.
 * Server writes: `{"chunk":"...text..."}\n` per event.
 */
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
							const parsed = JSON.parse(trimmed) as { chunk?: string }
							if (parsed.chunk) observer.next(parsed.chunk)
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
		if (!state.selectedOperator) return of<Action>({ type: 'CHAT_ERROR', message: 'No operator selected' })

		return new Observable<Action>(observer => {
			fetch('/api/chat', {
				method:  'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					operator: state.selectedOperator,
					history:  state.chat.history.slice(0, -2), // exclude the placeholder pair just added by the reducer
					message:  action.content,
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
				.catch(err => observer.next({ type: 'CHAT_ERROR', message: String(err) }))
		})
	}),
)
