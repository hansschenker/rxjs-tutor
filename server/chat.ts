// server/chat.ts
import { Router } from 'express'
import Anthropic from '@anthropic-ai/sdk'
import type { Topic } from '../src/curriculum/types.js'

interface ChatRequest {
	topic:   Topic
	history: Array<{ role: 'user' | 'assistant'; content: string }>
	message: string
	config: {
		domainName:           string
		systemPromptTemplate: string
	}
}

const client = new Anthropic({ apiKey: process.env['ANTHROPIC_API_KEY'] })

function buildSystemPrompt(template: string, topic: Topic, domainName: string): string {
	return template
		.replace('{domainName}', domainName)
		.replace('{topicName}',  topic.name)
		.replace('{category}',   topic.category)
		.replace('{topicJson}',  JSON.stringify(topic, null, 2))
}

export const chatRouter = Router()

chatRouter.post('/chat', async (req, res) => {
	const { topic, history, message, config } = req.body as ChatRequest

	if (!topic || !history || !message || !config?.systemPromptTemplate) {
		res.status(400).json({ error: 'Invalid request body' })
		return
	}

	const systemPrompt = buildSystemPrompt(
		config.systemPromptTemplate,
		topic,
		config.domainName,
	)

	res.setHeader('Content-Type', 'application/x-ndjson')
	res.setHeader('Transfer-Encoding', 'chunked')
	res.setHeader('Cache-Control', 'no-cache')

	try {
		const stream = client.messages.stream({
			model:      'claude-sonnet-4-6',
			max_tokens: 1024,
			system:     systemPrompt,
			messages: [
				...history.map(m => ({ role: m.role, content: m.content })),
				{ role: 'user', content: message },
			],
		})

		for await (const event of stream) {
			if (
				event.type === 'content_block_delta' &&
				event.delta.type === 'text_delta'
			) {
				res.write(JSON.stringify({ chunk: event.delta.text }) + '\n')
			}
		}

		res.end()
	} catch (err) {
		res.write(JSON.stringify({ error: String(err) }) + '\n')
		res.end()
	}
})
