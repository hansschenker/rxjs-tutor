// src/curriculum/types.ts

export interface CodeExample {
	title: string
	content: string
}

export interface Topic {
	name: string
	category: string
	description: string
	examples: CodeExample[]
	tags: string[]
	visual?: string
	definition?: string
	seeAlso?: string[]
	meta?: Record<string, string>
}

export interface Family {
	name: string
	description: string
	topics: Topic[]
}

export interface TutorConfig {
	domainName: string
	systemPromptTemplate: string
	defaultCategory: string
	defaultTopic: string
	labels: {
		category: string
		topic: string
		visual?: string
		definition?: string
	}
}
