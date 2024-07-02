import { createOpenAI } from "@ai-sdk/openai"
import { generateObject } from "ai"
import { z } from 'zod'

const openai = createOpenAI({
    apiKey: process.env.INKEEP_API_KEY,
    baseURL: 'https://api.inkeep.com/v1'
})


const initialDraft = `
  <draftPrompt>
    <persona>You are an AI assistant tasked with providing an initial draft answer to a user's question.</persona>
  
    <alternativePhrasesOfQuestion>
      <goal>Generate 3 alternative ways to ask the same question using different terminology.</goal>
      <stepByStepInstructions>
      1. Based on the available information sources, think about all the possible interpretations of what the user may have meant.
      2. Generate 3 alternative ways to ask the same question.
      3. Consider both terminology found in the documentation and how a user may ask it if they are not an expert.
      </stepByStepInstructions>
      
      <considerations>
        - Be creative in generating alternative question phrasings
        - Use synonyms and rephrase the question to capture different nuances or possible phrasings. 
        - Assume the user is not a pro and may not have used the correct terminology.
        - Expand on any acronyms used and include both the acronym and the full term (if applicable).
      </considerations>
    </alternativePhrasesOfQuestion>
  
    <draftAnswer>
      <goal>Provide a draft answer to the user's question based on available information sources.</goal>
      <stepByStepInstructions>
        1. Analyze the question and identify the key components.
        2. Use (only) the information sources to create a draft reply.
      </stepByStepInstructions>
      <considerations>
        - Your answer should be comprehensive and detailed.
        - Only answer based on the information sources you see, do not make assumptions.
        - State anything that is unclear or ambiguious about the question, information sources, or your answer. I.e. include caveats.
        - In general, be circumspect and thorough.
      </considerations>
    </draftAnswer>
  
    <subQueries>
      <goal>Generate 3 subquery questions that would have asked if you could break down the problem further initially.</goal>
      <stepByStepInstructions>
        1. Introspect about parts of the question that there was not enough information to cover, could have been interpreted differently, or were ambiguious from the information sources.
        2. Break down the problem or the remaining ambiguities into "sub questions"
        3. Each sub question should only deal with one topic at a time. Think of it as breaking down the problem.
      </stepByStepInstructions>
      <considerations>
        1. Assume that you did not have full context to answer the question.
        2. Deeply think about sub-questions you would ask to further query for information that would help answer this question.
        3. THESE SHOULD BE VERY SIMPLE, ATOMIC SUB-QUESTIONS. They should aim to understand all terminology or possible concepts of the question.
      </considerations>
    </subQueries>
  
  </draftPrompt>
  `

const refiner = `
<refinePrompt>
  <persona>You are an AI assistant acting as a judicious refiner to improve the draft answer. You are part of a recursive chain used to perfect an answer to a user question.</persona>
  <goal>Refine the draft answer, alternative question phrasings, and subqueries based on the additional context retrived using the subqueries.</goal>
  <stepByStepInstructions>
    1. Review the draft answer, subqueries and new information sources.
    2. Identify if new information or interpretations are appropriate based on this additional context.
    3. Update the alternative questions, draft answer, and subqueries based on these considerations.
  </stepByStepInstructions>
  <considerations>
    - The original answer may have been right. Or wrong. Don't make an assumption either way, do your own analysis.
    - Only modify the output if there is tangible new information that helps give better outputs. Otherwise just respond with the same as before.
    - Aim to provide the most accurate and comprehensive answer possible.
  </considerations>
</refinePrompt>
`


const SourceSchema = z.object({
    title: z.string().optional(),
    url: z.string().optional()
}).describe('A source used to generate this answer.')

const AnswerSchema = z.object({
    content: z.string().describe('The draft answer. Be comprehensive and detailed.'),
    sources: z.array(SourceSchema).describe('The sources used to generate the answer. Do not miss these! All parts of your answer should be based on factual information. Only include ones that were relevant and used in the answer.')
}).describe('An answer to the user\'s question.')

const RefineQuerySchema = z.object({
    alternativePhrasesOfQuestion: z.array(z.string()).length(3).describe('Alternative ways to ask the same question.'),
    draftAnswer: AnswerSchema,
    subQueries: z.array(z.string()).length(3).describe('Questions you would use if you could break down the problem further into smaller substeps.')
}).describe('The schema for refining a query.')

const refinerChain = async (input: z.infer<typeof RefineQuerySchema>) => {
    const res = await generateObject({
        model: openai('inkeep-contextual-gpt-4-turbo'),
        schema: RefineQuerySchema,
        maxTokens: 4096,
        mode: 'tool',
        maxRetries: 1,
        messages: [
            {
                role: "system",
                content: `Original instructions: \n ${initialDraft}`
            },
            {
                role: "system",
                content: `Recursive insstructions: \n ${refiner}`
            },
            {
                role: "user",
                content: JSON.stringify(input)
            }
        ]
    })

    return res
}

const initialDraftChain = async ({ question }: { question: string }) => {
    const res = await generateObject({
        model: openai('inkeep-contextual-gpt-4-turbo'),
        schema: RefineQuerySchema,
        maxTokens: 4096,
        mode: 'tool',
        maxRetries: 1,
        messages: [
            {
                role: "system",
                content: initialDraft
            },
            {
                role: "user",
                content: question
            }
        ]
    })

    return res.object;
}

const createRefinedAnswer = async ({ question }: { question: string }) => {
    const initialDraft = await initialDraftChain({ question });
    console.log('Initial Draft:');
    console.log(JSON.stringify(initialDraft, null, 2));
    console.log('--------------------');

    const refined = await refinerChain(initialDraft);
    console.log('Refined Answer:');
    console.log(JSON.stringify(refined, null, 2));
    console.log('--------------------');
}

async function main() {
    const question = "How do I read and update edge config in the same API route?";
    await createRefinedAnswer({ question });
}

main().catch((error) => {
    console.error('An error occurred:', error);
    process.exit(1);
});