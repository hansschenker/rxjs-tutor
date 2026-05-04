// src/mvu/actions.ts
import type { Topic, Family, TutorConfig } from '../curriculum/types'

export type Action =
	| { type: 'TOPIC_SELECTED';        topic: Topic }
	| { type: 'CATEGORY_TOGGLED';      category: string }
	| { type: 'SEARCH_CHANGED';        query: string }
	| { type: 'CHAT_MESSAGE_SENT';     content: string }
	| { type: 'CHAT_CHUNK_RECEIVED';   chunk: string }
	| { type: 'CHAT_RESPONSE_COMPLETE' }
	| { type: 'CHAT_ERROR';            message: string }
	| { type: 'CURRICULUM_LOADED';     topics: Topic[]; families: Family[]; tutorConfig: TutorConfig }
	| { type: 'CURRICULUM_FAILED';     error: string }
