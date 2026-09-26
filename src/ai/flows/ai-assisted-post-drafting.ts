'use server';
/**
 * @fileOverview AI assistant that drafts professional posts for the feed.
 *
 * - aiAssistedPostDrafting - drafts a post from the user's notes.
 * - AiAssistedPostDraftingInput / AiAssistedPostDraftingOutput - its types.
 *
 * Server actions are callable by anyone who has the page's JavaScript, so
 * this checks the session and a per-user budget before spending on Gemini.
 * Genkit is imported on first use: the home page bundles this action, and a
 * top-level import made every cold start of "/" load the AI SDK.
 */

import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';

const AiAssistedPostDraftingInputSchema = z.object({
  topic: z.string().trim().min(3).max(2000).describe('The main subject or theme of the post.'),
  keywords: z
    .array(z.string().max(60))
    .max(10)
    .optional()
    .describe('Optional keywords or phrases to include in the post.'),
  tone: z
    .enum(['professional', 'enthusiastic', 'formal', 'friendly', 'informative', 'concise'])
    .default('professional')
    .describe('The desired tone for the post.'),
  length: z
    .enum(['short', 'medium', 'long'])
    .default('medium')
    .describe('The desired length of the post.'),
  existingContent: z
    .string()
    .max(5000)
    .optional()
    .describe('Any existing draft content or notes the user has already written.'),
});
export type AiAssistedPostDraftingInput = z.input<typeof AiAssistedPostDraftingInputSchema>;

const AiAssistedPostDraftingOutputSchema = z.object({
  draftedPost: z.string().describe('The AI-generated draft of the professional post.'),
  suggestions: z
    .array(z.string())
    .optional()
    .describe(
      'Suggestions for improving the post, such as alternative phrasing, additional points, or calls to action.'
    ),
});
export type AiAssistedPostDraftingOutput = z.infer<typeof AiAssistedPostDraftingOutputSchema>;

const PROMPT = `You are an AI assistant specialized in drafting professional and impactful posts for a B2B network. Your goal is to help users create compelling updates and announcements.

Draft a post based on the following instructions:
Topic: {{{topic}}}
{{#if keywords}}Keywords to include: {{#each keywords}}- {{{this}}} {{/each}}{{/if}}
Tone: {{{tone}}}
Length: {{{length}}}
{{#if existingContent}}Existing Content/Notes: {{{existingContent}}}{{/if}}

Please provide the draft post and also offer some suggestions for improvement. Ensure the post is suitable for a professional B2B audience.`;

type DraftFlow = (input: z.infer<typeof AiAssistedPostDraftingInputSchema>) => Promise<AiAssistedPostDraftingOutput>;
let flowPromise: Promise<DraftFlow> | null = null;

function getFlow(): Promise<DraftFlow> {
  flowPromise ??= import('@/ai/genkit').then(({ ai }) => {
    const postDraftingPrompt = ai.definePrompt({
      name: 'postDraftingPrompt',
      input: { schema: AiAssistedPostDraftingInputSchema },
      output: { schema: AiAssistedPostDraftingOutputSchema },
      prompt: PROMPT,
    });
    return ai.defineFlow(
      {
        name: 'aiAssistedPostDraftingFlow',
        inputSchema: AiAssistedPostDraftingInputSchema,
        outputSchema: AiAssistedPostDraftingOutputSchema,
      },
      async (input) => {
        const { output } = await postDraftingPrompt(input);
        if (!output) throw new Error('Failed to generate a draft post.');
        return output;
      },
    );
  });
  return flowPromise;
}

export async function aiAssistedPostDrafting(
  input: AiAssistedPostDraftingInput
): Promise<AiAssistedPostDraftingOutput> {
  const session = await getSession();
  if (!session) throw new Error('Please sign in to use AI drafting.');

  const rl = await rateLimit(`ai-draft:${session.id}`, 20, 3600);
  if (!rl.allowed) throw new Error('You have used your AI drafts for this hour. Please try again later.');

  const parsed = AiAssistedPostDraftingInputSchema.safeParse(input);
  if (!parsed.success) throw new Error('Please describe your post in 3 to 2000 characters.');

  const flow = await getFlow();
  return flow(parsed.data);
}
