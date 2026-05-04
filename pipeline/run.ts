// pipeline/run.ts

import Anthropic from '@anthropic-ai/sdk'
import { readFileSync } from 'fs'
import { join, resolve } from 'path'
import { writeOutput } from './writer.js'
import { runPipeline } from './service.js'
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

	const apiKey = process.env['ANTHROPIC_API_KEY']
	if (!apiKey) {
		console.error('ANTHROPIC_API_KEY environment variable is not set')
		process.exit(1)
	}
	const client = new Anthropic({ apiKey })

	console.log(`Running pipeline for domain: ${config.domain.name}`)
	const result    = await runPipeline(config, sourcesDir, client)
	const outputDir = resolve(config.output.dir)

	writeOutput(result.grouped, result.tutorConfig, outputDir)
	console.log('Done.')
}

run().catch(err => {
	console.error(err)
	process.exit(1)
})
