import 'server-only'
import {
  createAI,
  createStreamableUI,
  createStreamableValue,
  getMutableAIState,
  streamUI,
} from 'ai/rsc'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText, streamObject, streamText } from 'ai'
import {
  runAsyncFnWithoutBlocking,
  nanoid
} from '@/lib/utils'
import { saveChat } from '@/app/actions'
import { Chat,Message } from '@/lib/types'
import { auth } from '@/auth'
import { InkeepJsonMessageSchema } from './inkeepMessageSchema'
import test from 'node:test'
import { z } from 'zod'

const openai = createOpenAI({
  apiKey: process.env.INKEEP_API_KEY,
  baseURL: 'https://api.inkeep.com/v1'
})


// uses the `inkeep-contextual` model to generate a plain text response
async function submitMsgContextualStreamText(content: string){
  "use server"

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
    ],
  })

  const ui = createStreamableUI();

  runAsyncFnWithoutBlocking(async () => {
    const {textStream  } = result
    let ikpMsg = ''
    for await (const partialMessage of textStream) {
      console.log(partialMessage)
      ikpMsg += partialMessage
      ui.update(ikpMsg)
    }
    // have this render the desired React component with the markdown parsing and citations
    ui.done();
    aiState.done({
      chatId: nanoid(),
      messages: [
        ...aiState.get().messages,
        {
          id: nanoid(),
          role: 'assistant',
          content: ikpMsg,
          name: "inkeep-contextual-assistant-message"
        }
      ]
    })
  })

  return {
    id: nanoid(),
    display: ui.value
  }
}

// uses the `inkeep-contextual` model to generate a plain text response
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
  console.log("hello!");
  const result = await streamUI({
    model: openai('inkeep-contextual-gpt-4o'),
    messages: [
      {
        role: 'system',
        content: 'Respond to the user question using the `answerInMarkdown` tool.'
      },
      ...aiState.get().messages.map((message: any) => ({
        role: message.role,
        content: message.content,
        name: 'inkeep-contextual-user-message'
      }))
    ],
    tools: {
      answerInMarkdown: {
        description: 'An answer to the users question in markdown',
        parameters: InkeepJsonMessageSchema,
        generate: async function* (answer: z.infer<typeof InkeepJsonMessageSchema>){
          console.log("trying!")
          console.log(answer);
          try {
            yield <>${JSON.stringify(answer)}</>;
          } catch (error) {
            console.error("Invalid message format", error);
            // No return or yield in case of error, allowing continuation
          }

          console.log("should be last");
          aiState.done({
            chatId: nanoid(),
            messages: [
              ...aiState.get().messages,
              {
                id: nanoid(),
                role: 'assistant',
                content: answer.message.content,
                name: "inkeep-contextual-assistant-message"
              }
            ]
          })
          console.log(answer.message.content)
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

// uses the `inkeep-contextual` model to generate an object using streamObject
async function submitMsgContextualStreamObjectAsTool(content: string) {
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
    model: openai('inkeep-contextual-gpt-4o'),
    schema: InkeepJsonMessageSchema,
    maxTokens: 4096,
    mode: 'tool',
    messages: [
      ...aiState.get().messages.map((message: any) => ({
        role: message.role,
        content: message.content,
        name: 'inkeep-contextual-user-message'
      }))
    ]
  })

  const { partialObjectStream } = result

  runAsyncFnWithoutBlocking(async () => {
    let ikpMessageObj
    for await (const partialObject of partialObjectStream) {
      console.log('hello');
      console.log(partialObject);
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
          name: "inkeep-qa-assistant-message"
        }
      ]
    })
  })

  return {
    id: nanoid(),
    display: chatMessage.value
  }
}

// uses the `inkeep-qa` model to generate a JSON response (opinionated - always responds in same schema)
async function submitMsgQAModelStreamObjectJSONMode(content: string) {
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
          name: "inkeep-qa-assistant-message"
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
  submitMsgContextualStreamObjectAsTool,
  submitMsgQAModelStreamObjectJSONMode
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
