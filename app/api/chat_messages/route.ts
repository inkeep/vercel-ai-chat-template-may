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

// uses the `inkeep-qa` model to generate a predefined JSON response that includes a message and citations (opinionated)
export async function POST(req: Request) {
  const content = await req.json()

  const result = await streamObject({
    model: openai('inkeep-qa-gpt-4o'),
    schema: InkeepJsonMessageSchema,
    mode: 'json',
    messages: [
      ...content.messages.map((message: any) => ({
        role: message.role,
        content: message.content,
        name: 'inkeep-qa-user-message'
      }))
    ]
  })

  return result.toTextStreamResponse()
}
