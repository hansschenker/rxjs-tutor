// src/mvu/reducer.ts
import type { AppState } from './model'
import type { Action } from './actions'

export function reducer(state: AppState, action: Action): AppState {
	switch (action.type) {
		case 'OPERATOR_SELECTED':
			return {
				...state,
				selectedOperator: action.operator,
				selectedFamily:   action.operator.family,
				chat: { history: [], loading: false, error: null },
			}

		case 'FAMILY_TOGGLED': {
			const next = new Set(state.sidebarExpanded)
			if (next.has(action.family)) next.delete(action.family)
			else next.add(action.family)
			return { ...state, sidebarExpanded: next }
		}

		case 'SEARCH_CHANGED':
			return { ...state, searchQuery: action.query }

		case 'CHAT_MESSAGE_SENT':
			return {
				...state,
				chat: {
					history: [
						...state.chat.history,
						{ role: 'user',      content: action.content },
						{ role: 'assistant', content: '' },
					],
					loading: true,
					error:   null,
				},
			}

		case 'CHAT_CHUNK_RECEIVED': {
			const history = [...state.chat.history]
			const last    = history[history.length - 1]
			history[history.length - 1] = { ...last, content: last.content + action.chunk }
			return { ...state, chat: { ...state.chat, history } }
		}

		case 'CHAT_RESPONSE_COMPLETE':
			return { ...state, chat: { ...state.chat, loading: false } }

		case 'CHAT_ERROR':
			return { ...state, chat: { ...state.chat, loading: false, error: action.message } }

		default:
			return state
	}
}
