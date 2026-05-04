// src/mvu/reducer.ts
import type { AppState } from './model'
import type { Action }   from './actions'

export function reducer(state: AppState, action: Action): AppState {
	switch (action.type) {
		case 'TOPIC_SELECTED':
			return {
				...state,
				selectedTopic:    action.topic,
				selectedCategory: action.topic.category,
				chat: { history: [], loading: false, error: null },
			}

		case 'CATEGORY_TOGGLED': {
			const next = new Set(state.sidebarExpanded)
			if (next.has(action.category)) next.delete(action.category)
			else next.add(action.category)
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
			history[history.length - 1] = { ...last!, content: last!.content + action.chunk }
			return { ...state, chat: { ...state.chat, history } }
		}

		case 'CHAT_RESPONSE_COMPLETE':
			return { ...state, chat: { ...state.chat, loading: false } }

		case 'CHAT_ERROR':
			return { ...state, chat: { ...state.chat, loading: false, error: action.message } }

		case 'CURRICULUM_LOADED':
			return {
				...state,
				topics:           action.topics,
				families:         action.families,
				tutorConfig:      action.tutorConfig,
				curriculumStatus: 'ready',
				curriculumError:  null,
			}

		case 'CURRICULUM_FAILED':
			return {
				...state,
				curriculumStatus: 'error',
				curriculumError:  action.error,
			}

		default:
			return state
	}
}
