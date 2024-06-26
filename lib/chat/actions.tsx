import 'server-only'
import {
  createAI,
  createStreamableUI,
  createStreamableValue,
  getMutableAIState,
  streamUI
} from 'ai/rsc'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText, streamObject, streamText } from 'ai'
import { runAsyncFnWithoutBlocking, nanoid } from '@/lib/utils'
import { saveChat } from '@/app/actions'
import { Chat, Message } from '@/lib/types'
import { auth } from '@/auth'
import { InkeepJsonMessageSchema } from './inkeepMessageSchema'
import test from 'node:test'
import { z } from 'zod'
import { StepByStepSchema } from './StepSchema'
import { getClosestValidSchema } from './getClosestValidSchema'
import { Step } from './Step'

const openai = createOpenAI({
  apiKey: process.env.INKEEP_API_KEY,
  baseURL: 'https://api.inkeep.com/v1'
})

// uses the `inkeep-contextual` model to generate an object using streamObject
async function submitMsgContextualStreamObject(content: string) {
  'use server'

  const aiState = getMutableAIState<typeof AI>()

  aiState.update({
    ...aiState.get(),
    messages: [
      ...aiState.get().messages,
      {
        id: nanoid(),
        role: 'user',
        content
      }
    ]
  })

  const chatMessage = createStreamableUI()

  const result = await streamObject({
    model: openai('inkeep-contextual-gpt-4-turbo'),
    schema: StepByStepSchema,
    maxTokens: 4096,
    mode: 'tool',
    messages: [
      {
        role: "system",
        content: "Generate step-by-step instructions to answer the user questions. Break it down to be as granular as possible. Always generate more than one step."
      },
      ...aiState.get().messages.map((message: any) => ({
        role: message.role,
        content: message.content,
        name: 'inkeep-contextual-user-message'
      }))
    ]
  })

  runAsyncFnWithoutBlocking(async () => {
    const { partialObjectStream } = result
    let content
    let steps

    for await (const partialObject of partialObjectStream) {
      steps = (
        <div className="flex flex-col space-y-4">
          {partialObject.steps?.map((step, index) => (
            <Step key={index} {...step} />
          ))}
        </div>
      )
      chatMessage.update(steps)
      content = partialObject
    }

    // have this render the desired React component with the markdown parsing and citations
    chatMessage.done(steps)
    aiState.done({
      chatId: nanoid(),
      messages: [
        ...aiState.get().messages,
        {
          id: nanoid(),
          role: 'assistant',
          content: JSON.stringify(content) || '',
          name: 'inkeep-contextual-assistant-message'
        }
      ]
    })
  })

  return {
    id: nanoid(),
    display: chatMessage.value
  }
}

// uses the `inkeep-contextual` model to generate a plain text response
async function submitMsgContextualStreamText(content: string) {
  'use server'

  const aiState = getMutableAIState<typeof AI>()

  aiState.update({
    ...aiState.get(),
    messages: [
      ...aiState.get().messages,
      {
        id: nanoid(),
        role: 'user',
        content
      }
    ]
  })

  const result = await streamText({
    model: openai('inkeep-contextual-gpt-4o'),
    messages: [
      {
        role: 'system',
        content: 'Respond in french'
      },
      {
        role: 'system',
        content: `
            ## Persona
            You are a helpful assistant for Vercel. You help answer user questions about Next.js, Vercel, Turborepo and other parts of the Vercel platform based only on documentation. 

            ## Rule:
            - Include inline citations for all the information you provide in the format of: [Title](URL).
            - Ensure that all parts of your response are based on only the knowledge found in the information sources.
            - Respond in plaintext, no markdown
          `
      },
      {
        role: 'user',
        content: content
      }
    ]
  })

  const ui = createStreamableUI()

  runAsyncFnWithoutBlocking(async () => {
    const { textStream } = result
    let ikpMsg = ''
    for await (const partialMessage of textStream) {
      ikpMsg += partialMessage
      ui.update(ikpMsg)
    }
    // have this render the desired React component with the markdown parsing and citations
    ui.done()
    aiState.done({
      chatId: nanoid(),
      messages: [
        ...aiState.get().messages,
        {
          id: nanoid(),
          role: 'assistant',
          content: ikpMsg,
          name: 'inkeep-contextual-assistant-message'
        }
      ]
    })
  })

  return {
    id: nanoid(),
    display: ui.value
  }
}

// uses the `inkeep-contextual` model to generate a tool-using response using streamUI
// NOTE: currently 'generate' is not invoked on every streamed event, only at the end.
async function submitMsgContextualStreamUITools(content: string) {
  'use server'

  const aiState = getMutableAIState<typeof AI>()

  aiState.update({
    ...aiState.get(),
    messages: [
      ...aiState.get().messages,
      {
        id: nanoid(),
        role: 'user',
        content
      }
    ]
  })
  const result = await streamUI({
    model: openai('gpt-4-turbo'),
    messages: [
      {
        role: 'system',
        content:
          'Respond to the user question using the the answerInMarkdown tool. Make up an artificial answer.'
      },
      ...aiState.get().messages.map((message: any) => ({
        role: message.role,
        content: message.content,
        name: 'inkeep-contextual-user-message'
      }))
    ],
    tools: {
      // define your own
      answerInMarkdown: {
        description: 'Answer the user question in markdown',
        parameters: InkeepJsonMessageSchema,
        generate: async function* (answer: any) {
          console.log('Yielding answer:', answer)
          yield <>${JSON.stringify(answer)}</>

          aiState.done({
            chatId: nanoid(),
            messages: [
              ...aiState.get().messages,
              {
                id: nanoid(),
                role: 'assistant',
                content: answer.message.content,
                name: 'inkeep-contextual-assistant-message'
              }
            ]
          })

          return <>${JSON.stringify(answer)}</>
        }
      }
    }
  })

  return {
    id: nanoid(),
    display: result.value
  }
}

// uses the `inkeep-qa` model to generate a JSON response (opinionated - always responds in predefined schema)
async function submitMsgQAModelStreamObject(content: string) {
  'use server'

  const aiState = getMutableAIState<typeof AI>()

  aiState.update({
    ...aiState.get(),
    messages: [
      ...aiState.get().messages,
      {
        id: nanoid(),
        role: 'user',
        content
      }
    ]
  })

  const chatMessage = createStreamableUI()

  const result = await streamObject({
    model: openai('inkeep-qa-gpt-4o'),
    schema: InkeepJsonMessageSchema,
    mode: 'json',
    messages: [
      ...aiState.get().messages.map((message: any) => ({
        role: message.role,
        content: message.content,
        name: 'inkeep-qa-user-message'
      }))
    ]
  })

  const { partialObjectStream } = result

  runAsyncFnWithoutBlocking(async () => {
    let ikpMessageObj
    for await (const partialObject of partialObjectStream) {
      chatMessage.update(partialObject.message?.content)
      ikpMessageObj = partialObject
    }
    // have this render the desired React component with the markdown parsing and citations
    chatMessage.done(ikpMessageObj?.message?.content)
    aiState.done({
      chatId: nanoid(),
      messages: [
        ...aiState.get().messages,
        {
          id: nanoid(),
          role: 'assistant',
          content: ikpMessageObj?.message?.content || '',
          name: 'inkeep-qa-assistant-message'
        }
      ]
    })
  })

  return {
    id: nanoid(),
    display: chatMessage.value
  }
}

export type AIState = {
  chatId: string
  messages: Message[]
}

export type UIState = {
  id: string
  display: React.ReactNode
}[]

const actions = {
  submitMsgContextualStreamText,
  submitMsgContextualStreamUITools,
  submitMsgContextualStreamObject,
  submitMsgQAModelStreamObject
}

export type Actions = typeof actions

export const AI = createAI<AIState, UIState>({
  actions,
  initialUIState: [],
  initialAIState: { chatId: nanoid(), messages: [] }
  //TODO: implement onGetUIState and onSetAIState for Inkeep messages
  // onGetUIState: async () => {
  //   'use server'

  //   const session = await auth()

  //   if (session && session.user) {
  //     const aiState = getAIState()

  //     if (aiState) {
  //       const uiState = getUIStateFromAIState(aiState)
  //       return uiState
  //     }
  //   } else {
  //     return
  //   }
  // },
  // onSetAIState: async ({ state }) => {
  //   'use server'

  //   const session = await auth()

  //   if (session && session.user) {
  //     const { chatId, messages } = state

  //     const createdAt = new Date()
  //     const userId = session.user.id as string
  //     const path = `/chat/${chatId}`

  //     const firstMessageContent = messages[0].content as string
  //     const title = firstMessageContent.substring(0, 100)

  //     const chat: Chat = {
  //       id: chatId,
  //       title,
  //       userId,
  //       createdAt,
  //       messages,
  //       path
  //     }

  //     await saveChat(chat)
  //   } else {
  //     return
  //   }
  // }
})

// export const getUIStateFromAIState = (aiState: Chat) => {
//   return aiState.messages
//     .filter(message => message.role !== 'system')
//     .map((message, index) => ({
//       id: `${aiState.chatId}-${index}`,
//       display:
//         message.role === 'tool' ? (
//           message.content.map(tool => {
//             return tool.toolName === 'listStocks' ? (
//               <BotCard>
//                 {/* TODO: Infer types based on the tool result*/}
//                 {/* @ts-expect-error */}
//                 <Stocks props={tool.result} />
//               </BotCard>
//             ) : tool.toolName === 'showStockPrice' ? (
//               <BotCard>
//                 {/* @ts-expect-error */}
//                 <Stock props={tool.result} />
//               </BotCard>
//             ) : tool.toolName === 'showStockPurchase' ? (
//               <BotCard>
//                 {/* @ts-expect-error */}
//                 <Purchase props={tool.result} />
//               </BotCard>
//             ) : tool.toolName === 'getEvents' ? (
//               <BotCard>
//                 {/* @ts-expect-error */}
//                 <Events props={tool.result} />
//               </BotCard>
//             ) : null
//           })
//         ) : message.role === 'user' ? (
//           <UserMessage>{message.content as string}</UserMessage>
//         ) : message.role === 'assistant' &&
//           typeof message.content === 'string' ? (
//           <BotMessage content={message.content} />
//         ) : null
//     }))
// }
