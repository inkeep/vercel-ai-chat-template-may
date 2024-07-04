import { AI } from '@/lib/chat/actions'
import { InkeepJsonMessageSchema } from '@/lib/chat/inkeepMessageSchema'
import { nanoid, runAsyncFnWithoutBlocking } from '@/lib/utils'
import { createOpenAI } from '@ai-sdk/openai'
import { streamObject } from 'ai'
import { getMutableAIState } from 'ai/rsc'
// import { notificationSchema } from './schema'

const openai = createOpenAI({
  apiKey: process.env.INKEEP_API_KEY,
  baseURL: 'https://api.inkeep.com/v1'
})

// Allow streaming responses up to 30 seconds
// export const maxDuration = 30

// uses the `inkeep-qa` model to generate a predefined JSON response that includes a message and citations (opinionated)

export async function POST(req: Request) {
  const content = await req.json()

  const result = await streamObject({
    model: openai('inkeep-qa-gpt-4o'),
    schema: InkeepJsonMessageSchema,
    mode: 'json',
    messages: [
      {
        role: 'user',
        content
      }
    ]
  })

  return result.toTextStreamResponse()
}
