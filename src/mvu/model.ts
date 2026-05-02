// src/mvu/model.ts
import type { Operator, OperatorFamily } from '../curriculum/types'

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
	selectedFamily:   OperatorFamily | null
	selectedOperator: Operator | null
	searchQuery:      string
	sidebarExpanded:  Set<OperatorFamily>
	chat:             ChatState
}

export const initialState: AppState = {
	selectedFamily:   null,
	selectedOperator: null,
	searchQuery:      '',
	sidebarExpanded:  new Set(),
	chat: { history: [], loading: false, error: null },
}
