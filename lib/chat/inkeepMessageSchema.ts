import { z } from 'zod';

const RecordTypesSchema = z.union([
    z.literal('DOCUMENTATION'),
    z.literal('SITE'),
    z.literal('DISCOURSE_POST'),
    z.literal('GITHUB_ISSUE'),
    z.literal('GITHUB_DISCUSSION'),
    z.literal('STACKOVERFLOW_QUESTION'),
    z.literal('DISCORD_FORUM_POST'),
    z.literal('DISCORD_MESSAGE'),
    z.literal('CUSTOM_QUESTION_ANSWER'),
    z.string()
]);

const RecordSchema = z.object({
    type: RecordTypesSchema,
    url: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    breadcrumbs: z.array(z.string()).optional(),
}).passthrough();

const CitationSchema = z.object({
    number: z.number().int(),
    record: RecordSchema.optional(),
    hitUrl: z.string().optional(),
}).passthrough().describe('List of citations from the information sources used to answer the users question. If using citations, incorporate them into the response in the format `[number](url)` where number corresponds to the order you use them')

const RecordsCited = z.object({
    citations: z.array(CitationSchema)
}).passthrough()

const AssistantMessage = z.object({
    content: z.string().describe('Answer to users question'),
    role: z.literal('assistant').describe("Should always be 'assistant'")
}).passthrough();

export const InkeepJsonMessageSchema = z.object({
    message: AssistantMessage,
    recordsCited: RecordsCited.optional(),
}).passthrough();