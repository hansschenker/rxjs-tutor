// src/mvu/model.ts
import type { Topic, Family, TutorConfig } from '../curriculum/types'

export type CurriculumStatus = 'loading' | 'ready' | 'error'

export interface ChatMessage {
	role: 'user' | 'assistant'
	content: string
}

export interface ChatState {
	history: ChatMessage[]
	loading: boolean
	error:   string | null
}

export interface AppState {
	selectedCategory: string | null
	selectedTopic:    Topic | null
	searchQuery:      string
	sidebarExpanded:  Set<string>
	chat:             ChatState
	topics:           Topic[]
	families:         Family[]
	tutorConfig:      TutorConfig | null
	curriculumStatus: CurriculumStatus
	curriculumError:  string | null
}

export const initialState: AppState = {
	selectedCategory: null,
	selectedTopic:    null,
	searchQuery:      '',
	sidebarExpanded:  new Set(),
	chat:             { history: [], loading: false, error: null },
	topics:           [],
	families:         [],
	tutorConfig:      null,
	curriculumStatus: 'loading',
	curriculumError:  null,
}
