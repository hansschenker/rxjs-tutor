// src/mvu/actions.ts
import type { Operator, OperatorFamily } from '../curriculum/types'

export type Action =
	| { type: 'OPERATOR_SELECTED';      operator: Operator }
	| { type: 'FAMILY_TOGGLED';         family: OperatorFamily }
	| { type: 'SEARCH_CHANGED';         query: string }
	| { type: 'CHAT_MESSAGE_SENT';      content: string }
	| { type: 'CHAT_CHUNK_RECEIVED';    chunk: string }
	| { type: 'CHAT_RESPONSE_COMPLETE' }
	| { type: 'CHAT_ERROR';             message: string }
