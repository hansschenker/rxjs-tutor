// pipeline/loader.ts

import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import type { SourceDocument } from './types.js'

export function loadSourceDocuments(sourceDir: string): SourceDocument[] {
	const files = readdirSync(sourceDir)
		.filter(f => f.endsWith('.md') || f.endsWith('.txt'))
		.sort()
	return files.map(filename => ({
		filename,
		content: readFileSync(join(sourceDir, filename), 'utf-8'),
	}))
}
