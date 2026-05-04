// server/index.ts
import express from 'express'
import { chatRouter }     from './chat.js'
import { pipelineRouter } from './pipeline.js'

const app = express()

app.use(express.json())
app.use('/api', chatRouter)
app.use('/api', pipelineRouter)

const PORT = 3001
app.listen(PORT, () => console.log(`Server listening on :${PORT}`))
