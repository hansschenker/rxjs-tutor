// server/index.ts
import express from 'express'
import { chatRouter }     from './chat.js'
import { pipelineRouter } from './pipeline.js'

const app = express()

app.use(express.json())
app.use((_req, res, next) => {
	res.setHeader('Content-Security-Policy', "default-src 'none'; connect-src 'self' http://localhost:3001;")
	next()
})
app.use('/api', chatRouter)
app.use('/api', pipelineRouter)

const PORT = Number(process.env['PORT'] ?? 3001)
app.listen(PORT, () => console.log(`Server listening on :${PORT}`))
