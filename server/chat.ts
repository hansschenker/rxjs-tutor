// server/chat.ts
import express from 'express'
import Anthropic from '@anthropic-ai/sdk'
import type { Operator } from '../src/curriculum/types.js'

const app	= express()
const client = new Anthropic({ apiKey: process.env['ANTHROPIC_API_KEY'] })

app.use(express.json())

app.post('/api/chat', async (req, res) => {
	const { operator, history, message } = req.body as {
		operator: Operator
		history:	Array<{ role: 'user' | 'assistant'; content: string }>
		message:	string
	}

	const systemPrompt = [
		`You are an expert RxJS tutor. Answer concisely and use code examples.`,
		`The user is currently viewing the \`${operator.name}\` operator (${operator.family} family).`,
		`Here is its definition: ${JSON.stringify(operator, null, 2)}`,
		`Reference the marble diagram and examples in your answers when helpful.`,
	].join('\n')

	res.setHeader('Content-Type', 'application/x-ndjson')
	res.setHeader('Transfer-Encoding', 'chunked')
	res.setHeader('Cache-Control', 'no-cache')

	try {
		const stream = client.messages.stream({
			model:		'claude-haiku-4-5-20251001',
			max_tokens: 1024,
			system:		systemPrompt,
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

const PORT = 3001
app.listen(PORT, () => console.log(`Chat proxy listening on :${PORT}`))
