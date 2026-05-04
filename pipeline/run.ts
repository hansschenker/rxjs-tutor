// pipeline/run.ts

import Anthropic from '@anthropic-ai/sdk'
import { readFileSync } from 'fs'
import { join, resolve } from 'path'
import { loadSourceDocuments } from './loader.js'
import { extractTopics } from './extractor.js'
import { mergeTopics, groupByCategory } from './merger.js'
import { writeOutput } from './writer.js'
import { buildTutorConfig } from './types.js'
import type { PipelineConfig } from './types.js'

async function run(): Promise<void> {
	const [, , configPath] = process.argv
	if (!configPath) {
		console.error('Usage: tsx pipeline/run.ts <path/to/config.json>')
		process.exit(1)
	}

	const config: PipelineConfig = JSON.parse(
		readFileSync(resolve(configPath), 'utf-8')
	)

	const sourcesDir = join(resolve(configPath), '..', 'sources')
	const docs       = loadSourceDocuments(sourcesDir)
	console.log(`Loaded ${docs.length} source file(s): ${docs.map(d => d.filename).join(', ')}`)

	const apiKey = process.env['ANTHROPIC_API_KEY']
	if (!apiKey) {
		console.error('ANTHROPIC_API_KEY environment variable is not set')
		process.exit(1)
	}
	const client = new Anthropic({ apiKey })

	const results = []
	for (const doc of docs) {
		console.log(`Extracting topics from ${doc.filename}…`)
		const result = await extractTopics(doc, config, client)
		console.log(`  → ${result.topics.length} topic(s) extracted`)
		results.push(result)
	}

	const merged  = mergeTopics(results)
	console.log(`Merged: ${merged.length} unique topic(s)`)

	const grouped     = groupByCategory(merged)
	const tutorConfig = buildTutorConfig(config)
	const outputDir   = resolve(config.output.dir)

	writeOutput(grouped, tutorConfig, outputDir)
	console.log(`Done.`)
}

run().catch(err => {
	console.error(err)
	process.exit(1)
})
