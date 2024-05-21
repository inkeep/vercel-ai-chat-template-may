import 'server-only'
import {
  createAI,
  createStreamableUI,
  getMutableAIState,
} from 'ai/rsc'
import { createOpenAI } from '@ai-sdk/openai'
import { streamObject } from 'ai'
import {
  runAsyncFnWithoutBlocking,
  nanoid
} from '@/lib/utils'
import { saveChat } from '@/app/actions'
import { Chat,Message } from '@/lib/types'
import { auth } from '@/auth'
import { InkeepJsonMessageSchema } from './inkeepMessageSchema'

async function submitUserMessage(content: string) {
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

  const openai = createOpenAI({
    apiKey: process.env.INKEEP_API_KEY,
    baseURL: 'https://inkeep.ngrok.io/v1'
  })

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
  submitUserMessage
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
