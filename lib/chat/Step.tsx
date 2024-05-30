import { z } from 'zod'
import { StepSchema } from './StepSchema'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { DeepPartial } from 'ai'
import { MemoizedReactMarkdown } from '@/components/markdown'
import { Sources } from '@/components/source'

export function Step({
  headline,
  content,
  sources
}: DeepPartial<z.infer<typeof StepSchema>>) {
  return (
    <Alert>
      <AlertTitle>{headline}</AlertTitle>
      <AlertDescription>
        <MemoizedReactMarkdown>{content || ''}</MemoizedReactMarkdown>
      </AlertDescription>
      <div className="my-2 h-px bg-gray-300"></div>
      <Sources sources={sources}></Sources>
    </Alert>
  )
}
