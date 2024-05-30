import { z } from 'zod'

export const SourceSchema = z
  .object({
    title: z.string().optional(),
    url: z.string().optional()
  })
  .describe('A single information source used to generate this step, if any.')

export const SourcesSchema = z
  .array(SourceSchema)
  .describe('The sources used to generate this step, if any. Please cite the information source you used to generate answers.')
  .optional()

export const StepSchema = z
  .object({
    headline: z
      .string()
      .describe('The main point or title of the step. E.g. "Install package". Number your steps, e.g. "1. Get Started"'),
    content: z
      .string()
      .describe(
        'Detailed instructions or information for the step. In Markdown.'
      ),
    sources: SourcesSchema
  })
  .passthrough()

export const StepByStepSchema = z
  .object({
    steps: z.array(StepSchema).describe('A list of steps to follow')
  })
  .passthrough()
  .describe(
    'Schema for breaking down instructions step by step. Return different steps for each sub-step. Try to be as granualar as possible and provide sources for your steps.'
  )
