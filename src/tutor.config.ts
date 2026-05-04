// src/tutor.config.ts
import type { TutorConfig } from './curriculum/types.js'

export const config: TutorConfig = {
	domainName: 'RxJS',
	systemPromptTemplate:
		'You are an expert {domainName} tutor. Answer concisely and use code examples.\n' +
		'The user is currently viewing "{topicName}" ({category}).\n' +
		'Here is its full definition: {topicJson}\n' +
		'Reference the visual diagram and examples in your answers when helpful.',
	defaultCategory: 'Transformation',
	defaultTopic: 'switchMap',
	labels: {
		category: 'Family',
		topic: 'Operator',
		visual: 'Marble Diagram',
		definition: 'Signature',
	},
}
