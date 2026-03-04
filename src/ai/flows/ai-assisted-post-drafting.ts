'use server';
/**
 * @fileOverview A Genkit flow for an AI assistant that helps users draft professional and impactful posts.
 *
 * - aiAssistedPostDrafting - A function that leverages AI to draft posts based on user input.
 * - AiAssistedPostDraftingInput - The input type for the aiAssistedPostDrafting function.
 * - AiAssistedPostDraftingOutput - The return type for the aiAssistedPostDrafting function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AiAssistedPostDraftingInputSchema = z.object({
  topic: z.string().describe('The main subject or theme of the post.'),
  keywords: z
    .array(z.string())
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
    .optional()
    .describe('Any existing draft content or notes the user has already written.'),
});
export type AiAssistedPostDraftingInput = z.infer<
  typeof AiAssistedPostDraftingInputSchema
>;

const AiAssistedPostDraftingOutputSchema = z.object({
  draftedPost: z.string().describe('The AI-generated draft of the professional post.'),
  suggestions: z
    .array(z.string())
    .optional()
    .describe(
      'Suggestions for improving the post, such as alternative phrasing, additional points, or calls to action.'
    ),
});
export type AiAssistedPostDraftingOutput = z.infer<
  typeof AiAssistedPostDraftingOutputSchema
>;

export async function aiAssistedPostDrafting(
  input: AiAssistedPostDraftingInput
): Promise<AiAssistedPostDraftingOutput> {
  return aiAssistedPostDraftingFlow(input);
}

const postDraftingPrompt = ai.definePrompt({
  name: 'postDraftingPrompt',
  input: {schema: AiAssistedPostDraftingInputSchema},
  output: {schema: AiAssistedPostDraftingOutputSchema},
  prompt: `You are an AI assistant specialized in drafting professional and impactful posts for a B2B network. Your goal is to help users create compelling updates and announcements.

Draft a post based on the following instructions:
Topic: {{{topic}}}
{{#if keywords}}Keywords to include: {{#each keywords}}- {{{this}}} {{/each}}{{/if}}
Tone: {{{tone}}}
Length: {{{length}}}
{{#if existingContent}}Existing Content/Notes: {{{existingContent}}}{{/if}}

Please provide the draft post and also offer some suggestions for improvement. Ensure the post is suitable for a professional B2B audience.`,
});

const aiAssistedPostDraftingFlow = ai.defineFlow(
  {
    name: 'aiAssistedPostDraftingFlow',
    inputSchema: AiAssistedPostDraftingInputSchema,
    outputSchema: AiAssistedPostDraftingOutputSchema,
  },
  async input => {
    const {output} = await postDraftingPrompt(input);
    if (!output) {
      throw new Error('Failed to generate a draft post.');
    }
    return output;
  }
);
