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
	/** Domain-specific extension fields rendered as-is in the reference panel. */
	meta?: Record<string, string>
}

export interface Family {
	name: string
	description?: string
	topics: Topic[]
}

export interface TutorConfig {
	domainName: string
	/**
	 * Template for the AI system prompt. Supported placeholders:
	 *   {domainName}  — e.g. "RxJS"
	 *   {topicName}   — the topic name
	 *   {category}    — the category/family name
	 *   {topicJson}   — JSON.stringify of the Topic object
	 */
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

export interface CurriculumJson {
	domain:      string
	generatedAt: string
	topics:      Topic[]
	families:    Family[]
	tutorConfig: TutorConfig
}
