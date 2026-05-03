// src/mvu/model.ts
import type { Topic } from '../curriculum/types'

export interface ChatMessage {
	role: 'user' | 'assistant'
	content: string
}

export interface ChatState {
	history: ChatMessage[]
	loading: boolean
	error: string | null
}

export interface AppState {
	selectedCategory: string | null
	selectedTopic:    Topic | null
	searchQuery:      string
	sidebarExpanded:  Set<string>
	chat:             ChatState
}

export const initialState: AppState = {
	selectedCategory: null,
	selectedTopic:    null,
	searchQuery:      '',
	sidebarExpanded:  new Set(),
	chat: { history: [], loading: false, error: null },
}
