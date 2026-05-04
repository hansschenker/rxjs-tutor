// pipeline/service.ts

import Anthropic from '@anthropic-ai/sdk'
import { loadSourceDocuments }       from './loader.js'
import { extractTopics }             from './extractor.js'
import { mergeTopics, groupByCategory } from './merger.js'
import { buildTutorConfig }          from './types.js'
import type { PipelineConfig, RawTopic } from './types.js'
import type { TutorConfig }          from '../src/curriculum/types.js'

export interface PipelineResult {
	grouped:     Map<string, RawTopic[]>
	tutorConfig: TutorConfig
}

export async function runPipeline(
	config:     PipelineConfig,
	sourcesDir: string,
	client:     Anthropic,
): Promise<PipelineResult> {
	const docs    = loadSourceDocuments(sourcesDir)
	const results = []
	for (const doc of docs) {
		const result = await extractTopics(doc, config, client)
		results.push(result)
	}
	const merged  = mergeTopics(results)
	const grouped = groupByCategory(merged)
	return { grouped, tutorConfig: buildTutorConfig(config) }
}
