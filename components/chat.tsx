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
import { AIState } from '@/lib/chat/actions'

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

export function ChatComponentWithUseObject({
  id,
  className,
  session,
  missingKeys
}: ChatProps) {
  const router = useRouter()
  const path = usePathname()
  const [input, setInput] = useState('')
  const [messages, setMessages] = useUIState()
  const [aiState, setAIState] = useAIState()
  const [currentResponseID, setCurrentResponseID] = useState('')
  const [lastResponseObjectMessage, setLastResponseObjectMessage] = useState('')

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

  const {
    object: streamResponseObject,
    submit,
    isLoading,
    error,
    stop
  } = experimental_useObject({
    api: '/api/chat_messages',
    schema: InkeepJsonMessageSchema
  })

  console.log({ streamResponseObject, isLoading, aiState, messages })

  const submitMessage = (value: any) => {
    // set AI state and UI state
    const IDForUserInput = nanoid()

    setAIState((currentAIState: any) => ({
      ...currentAIState,
      messages: [
        ...currentAIState.messages,
        {
          id: IDForUserInput,
          role: 'user',
          content: value
        }
      ]
    }))

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
          content: value,
          id: IDForUserInput
        }
      ]
    })

    setCurrentResponseID(nanoid())
  }

  useEffect(() => {
    const isMessageContentNew = streamResponseObject?.message?.content !== lastResponseObjectMessage

    if (streamResponseObject?.message && isMessageContentNew && currentResponseID && isLoading) {
      const responseMessageForUIState = {
        id: currentResponseID,
        display: <InkeepMessage {...streamResponseObject} />
      }

      const responseMessageForAIState = {
        id: currentResponseID,
        role: 'assistant',
        content: streamResponseObject?.message?.content || '',
        recordsCited: streamResponseObject?.recordsCited,
        name: 'inkeep-qa-assistant-message'
      }

      if (
        aiState.messages[aiState.messages.length - 1]?.id ===
        currentResponseID
      ) {
        setAIState((aiState: AIState) => ({
          ...aiState,
          messages: [
            ...aiState.messages.slice(0, -1),
            responseMessageForAIState
          ]
        }))
        setMessages((messages: any) => ([...messages.slice(0, -1), responseMessageForUIState]))
      } else {
        setAIState((aiState: AIState) => ({
          ...aiState,
          messages: [...aiState.messages, responseMessageForAIState]
        }))
        setMessages((messages: any) => ([...messages, responseMessageForUIState]))
      }
    }

    if (streamResponseObject && !isLoading && currentResponseID) {
      setCurrentResponseID('')
      setLastResponseObjectMessage(streamResponseObject.message?.content || '')
    }
  }, [streamResponseObject, currentResponseID, isLoading, lastResponseObjectMessage])

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
