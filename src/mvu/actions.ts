// src/mvu/actions.ts
import type { Topic } from '../curriculum/types'

export type Action =
	| { type: 'TOPIC_SELECTED';         topic: Topic }
	| { type: 'CATEGORY_TOGGLED';       category: string }
	| { type: 'SEARCH_CHANGED';         query: string }
	| { type: 'CHAT_MESSAGE_SENT';      content: string }
	| { type: 'CHAT_CHUNK_RECEIVED';    chunk: string }
	| { type: 'CHAT_RESPONSE_COMPLETE' }
	| { type: 'CHAT_ERROR';             message: string }
