// pipeline/types.ts

import type { TutorConfig } from '../src/curriculum/types.js'

export interface SourceDocument {
	filename: string
	content:  string
}

export interface PipelineConfig {
	domain: {
		name:            string
		description:     string
		defaultCategory: string
		defaultTopic:    string
		labels: {
			category:    string
			topic:       string
			visual?:     string
			definition?: string
		}
		systemPromptTemplate?: string
	}
	extraction: {
		model:         string
		maxChunkChars: number
	}
	output: {
		dir: string
	}
}

export interface ExtractionResult {
	sourceFile: string
	topics:     RawTopic[]
}

export interface RawTopic {
	name:        string
	category:    string
	description: string
	definition?: string
	visual?:     string
	examples?:   Array<{ title: string; content: string }>
	tags?:       string[]
	seeAlso?:    string[]
}

export function buildTutorConfig(config: PipelineConfig): TutorConfig {
	return {
		domainName: config.domain.name,
		systemPromptTemplate:
			config.domain.systemPromptTemplate ??
			'You are an expert {domainName} tutor. ' +
			'The user is currently viewing "{topicName}" ({category}). ' +
			'Here is its full definition: {topicJson}. ' +
			'Answer clearly, use concrete examples, and reference the definition when helpful.',
		defaultCategory: config.domain.defaultCategory,
		defaultTopic:    config.domain.defaultTopic,
		labels:          config.domain.labels,
	}
}

export function isRawTopic(v: unknown): v is RawTopic {
	if (typeof v !== 'object' || v === null) return false
	const r = v as Record<string, unknown>
	return typeof r['name'] === 'string'
		&& typeof r['category'] === 'string'
		&& typeof r['description'] === 'string'
}
