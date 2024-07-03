import { Sources } from '@/components/sources'
import { InkeepJsonMessageSchema } from '@/lib/chat/inkeepMessageSchema'
import { DeepPartial } from 'ai'
import { z } from 'zod'
import { RichMarkdownRenderer } from './RichMarkdownRenderer'

export function InkeepMessage({
  message,
  recordsCited
}: DeepPartial<z.infer<typeof InkeepJsonMessageSchema>>) {
  return (
    <div className="flex flex-col space-y-4">
      <RichMarkdownRenderer content={message?.content || ''} />
      {recordsCited && <Sources sources={recordsCited} />}
    </div>
  )
}
