'use client'

import { cn } from '@/lib/utils'
import { ChatList } from '@/components/chat-list'
import { ChatPanel } from '@/components/chat-panel'
import { EmptyScreen } from '@/components/empty-screen'
import { useLocalStorage } from '@/lib/hooks/use-local-storage'
import { useEffect, useState } from 'react'
import { useUIState, useAIState } from 'ai/rsc'
import { Message, Session } from '@/lib/types'
import { usePathname, useRouter } from 'next/navigation'
import { useScrollAnchor } from '@/lib/hooks/use-scroll-anchor'
import { experimental_useObject } from 'ai/react'
import { toast } from 'sonner'
import { InkeepMessage } from '@/lib/chat/InkeepMessage'
import { InkeepJsonMessageSchema } from '@/lib/chat/inkeepMessageSchema'
import { nanoid } from 'nanoid'
import { UserMessage } from './stocks/message'

export interface ChatProps extends React.ComponentProps<'div'> {
  initialMessages?: Message[]
  id?: string
  session?: Session
  missingKeys: string[]
}

export function Chat({ id, className, session, missingKeys }: ChatProps) {
  const router = useRouter()
  const path = usePathname()
  const [input, setInput] = useState('')
  const [messages] = useUIState()
  const [aiState] = useAIState()

  const [_, setNewChatId] = useLocalStorage('newChatId', id)

  useEffect(() => {
    if (session?.user) {
      if (!path.includes('chat') && messages.length === 1) {
        window.history.replaceState({}, '', `/chat/${id}`)
      }
    }
  }, [id, path, session?.user, messages])

  useEffect(() => {
    const messagesLength = aiState.messages?.length
    if (messagesLength === 2) {
      router.refresh()
    }
  }, [aiState.messages, router])

  useEffect(() => {
    setNewChatId(id)
  })

  useEffect(() => {
    missingKeys.map(key => {
      toast.error(`Missing ${key} environment variable!`)
    })
  }, [missingKeys])

  const { messagesRef, scrollRef, visibilityRef, isAtBottom, scrollToBottom } =
    useScrollAnchor()

  return (
    <div
      className="group w-full overflow-auto pl-0 peer-[[data-state=open]]:lg:pl-[250px] peer-[[data-state=open]]:xl:pl-[300px]"
      ref={scrollRef}
    >
      <div
        className={cn('pb-[200px] pt-4 md:pt-10', className)}
        ref={messagesRef}
      >
        {messages.length ? (
          <ChatList messages={messages} isShared={false} session={session} />
        ) : (
          <EmptyScreen />
        )}
        <div className="w-full h-px" ref={visibilityRef} />
      </div>
      <ChatPanel
        id={id}
        input={input}
        setInput={setInput}
        isAtBottom={isAtBottom}
        scrollToBottom={scrollToBottom}
      />
    </div>
  )
}

export function ChatComponentWithUseObject({ id, className, session, missingKeys }: ChatProps) {
  const router = useRouter()
  const path = usePathname()
  const [input, setInput] = useState('')
  const [messages, setMessages] = useUIState()
  const [aiState, setAiState] = useAIState()

  const [_, setNewChatId] = useLocalStorage('newChatId', id)

  useEffect(() => {
    if (session?.user) {
      if (!path.includes('chat') && messages.length === 1) {
        window.history.replaceState({}, '', `/chat/${id}`)
      }
    }
  }, [id, path, session?.user, messages])

  useEffect(() => {
    const messagesLength = aiState.messages?.length
    if (messagesLength === 2) {
      router.refresh()
    }
  }, [aiState.messages, router])

  useEffect(() => {
    setNewChatId(id)
  })

  useEffect(() => {
    missingKeys.map(key => {
      toast.error(`Missing ${key} environment variable!`)
    })
  }, [missingKeys])

  const { messagesRef, scrollRef, visibilityRef, isAtBottom, scrollToBottom } =
    useScrollAnchor()

  const { object, submit, isLoading, error, stop } = experimental_useObject({
    api: '/api/chat_messages',
    schema: InkeepJsonMessageSchema
    // initialValue: {}
  })

  const submitMessage = (value: any) => {
    const idToUse = nanoid()
    setAiState({
      ...aiState,
      messages: [
        ...aiState.messages,
        {
          id: idToUse,
          role: 'user',
          content: value
        }
      ]
    })
    setMessages((currentMessages: any) => [
      ...currentMessages,
      {
        id: nanoid(),
        display: <UserMessage>{value}</UserMessage>
      }
    ])

    submit({
      messages: [
        ...aiState.messages,
        {
          role: 'user',
          content: value
        }
      ]
    })
  }

  useEffect(() => {
    if (object?.message) {
      const responseMessage = {
        id: nanoid(),
        display: <InkeepMessage {...object} />
      }

      const responseMessageForAIState = {
        // id: nanoid(),
        role: 'assistant',
        content: object?.message?.content || '',
        recordsCited: object?.recordsCited,
        name: 'inkeep-qa-assistant-message'
      }

      if (aiState.messages[aiState.messages.length - 1]?.role === 'assistant') {
        setAiState({
          ...aiState,
          messages: [
            ...aiState.messages.slice(0, -1),
            responseMessageForAIState
          ]
        })
        setMessages([...messages.slice(0, -1), responseMessage])
      } else {
        setAiState({
          ...aiState,
          messages: [...aiState.messages, responseMessageForAIState]
        })
        setMessages([...messages, responseMessage])
      }
    }
  }, [object])

  return (
    <div
      className="group w-full overflow-auto pl-0 peer-[[data-state=open]]:lg:pl-[250px] peer-[[data-state=open]]:xl:pl-[300px]"
      ref={scrollRef}
    >
      <div
        className={cn('pb-[200px] pt-4 md:pt-10', className)}
        ref={messagesRef}
      >
        {messages.length ? (
          <ChatList messages={messages} isShared={false} session={session} />
        ) : (
          <EmptyScreen />
        )}
        <div className="w-full h-px" ref={visibilityRef} />
      </div>
      <ChatPanel
        id={id}
        input={input}
        setInput={setInput}
        isAtBottom={isAtBottom}
        scrollToBottom={scrollToBottom}
        submitMessage={submitMessage}
        stopRequest={stop}
      />
    </div>
  )
}
