// pipeline/extractor.ts

import Anthropic from '@anthropic-ai/sdk'
import type { PipelineConfig, SourceDocument, ExtractionResult, RawTopic } from './types.js'
import { isRawTopic } from './types.js'

const EXTRACTION_TOOL: Anthropic.Tool = {
	name: 'extract_topics',
	description: 'Extract all educational topics from the source material as structured data',
	input_schema: {
		type: 'object' as const,
		required: ['topics'],
		properties: {
			topics: {
				type: 'array',
				items: {
					type: 'object',
					required: ['name', 'category', 'description', 'examples', 'tags'],
					properties: {
						name:        { type: 'string' },
						category:    { type: 'string' },
						description: { type: 'string' },
						definition:  { type: 'string' },
						visual:      { type: 'string' },
						examples: {
							type: 'array',
							items: {
								type: 'object',
								required: ['title', 'content'],
								properties: {
									title:   { type: 'string' },
									content: { type: 'string' },
								},
							},
						},
						tags:    { type: 'array', items: { type: 'string' } },
						seeAlso: { type: 'array', items: { type: 'string' } },
					},
				},
			},
		},
	},
}

export async function extractTopics(
	doc:    SourceDocument,
	config: PipelineConfig,
	client: Anthropic,
): Promise<ExtractionResult> {
	const systemPrompt =
		`You extract structured educational topics from source material. ` +
		`Domain: ${config.domain.name}. ${config.domain.description}. ` +
		`Use the domain's terminology for categories ` +
		`(the category label is "${config.domain.labels.category}").`

	const response = await client.messages.create({
		model:       config.extraction.model,
		max_tokens:  4096,
		system:      systemPrompt,
		tools:       [EXTRACTION_TOOL],
		tool_choice: { type: 'any' },
		messages: [{
			role:    'user',
			content: `Extract all topics from the following source material:\n\n${doc.content}`,
		}],
	})

	const toolBlock = response.content.find(
		(b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === 'extract_topics'
	)
	if (!toolBlock) return { sourceFile: doc.filename, topics: [] }

	const input   = toolBlock.input as { topics?: unknown[] }
	const topics: RawTopic[] = (input.topics ?? []).flatMap((raw): RawTopic[] => {
		if (!isRawTopic(raw)) return []
		return [{
			name:        raw.name,
			category:    raw.category,
			description: raw.description,
			definition:  raw.definition  ?? '',
			visual:      raw.visual      ?? '',
			examples:    raw.examples    ?? [],
			tags:        raw.tags        ?? [],
			seeAlso:     raw.seeAlso     ?? [],
		}]
	})

	return { sourceFile: doc.filename, topics }
}
