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

  const object = null
  const submit = undefined
  const isLoading = false
  const stop = () => {}

  // Comment out above and uncomment below to test with experimental_useObject
  // const { object, submit, isLoading, error, stop } = experimental_useObject({
  //   api: '/api/chat_messages',
  //   schema: InkeepJsonMessageSchema,
    // initialValue: {
    //   message: {
    //     // id: nanoid(),
    //     role: 'user',
    //     content: input
    //   },
    //   citations: []
    // }
  // })

  console.log({ object, isLoading, input, messages, aiState })

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

        {object?.message && (
          <div className="relative mx-auto max-w-2xl px-4">
            <InkeepMessage
              message={object?.message}
              recordsCited={object?.recordsCited}
            />

            {/* {messages.map((message, index) => (
  <div key={message.id}>
    {message.display}
    {index < messages.length - 1 && <Separator className="my-4" />}
  </div>
))} */}
          </div>
        )}

        <div className="w-full h-px" ref={visibilityRef} />
      </div>
      <ChatPanel
        id={id}
        input={input}
        setInput={setInput}
        isAtBottom={isAtBottom}
        scrollToBottom={scrollToBottom}
        submitMessage={submit}
        stopRequest={stop}
      />
    </div>
  )
}
