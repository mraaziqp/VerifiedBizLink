'use server';
/**
 * @fileOverview An AI assistant for drafting polite and professional connection messages.
 *
 * - draftConnectionMessage - A function that handles the message drafting process.
 * - ConnectionMessageDraftingInput - The input type for the draftConnectionMessage function.
 * - ConnectionMessageDraftingOutput - The return type for the draftConnectionMessage function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ConnectionMessageDraftingInputSchema = z.object({
  targetCompanyName: z.string().describe('The name of the company the user wants to connect with.'),
  targetCompanyIndustry: z.string().describe('The industry of the target company.'),
  myCompanyName: z.string().describe('The user\'s company name.'),
  myCompanyIndustry: z.string().describe('The user\'s company industry.'),
  myPurposeForConnecting: z.string().describe('The user\'s high-level reason for wanting to connect (e.g., "explore partnership opportunities", "discuss potential collaboration on a project", "learn about their market strategy").'),
});
export type ConnectionMessageDraftingInput = z.infer<typeof ConnectionMessageDraftingInputSchema>;

const ConnectionMessageDraftingOutputSchema = z.object({
  draftMessage: z.string().describe('The professionally drafted connection message.'),
});
export type ConnectionMessageDraftingOutput = z.infer<typeof ConnectionMessageDraftingOutputSchema>;

export async function draftConnectionMessage(input: ConnectionMessageDraftingInput): Promise<ConnectionMessageDraftingOutput> {
  return aiAssistedConnectionMessageDraftingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'connectionMessageDraftingPrompt',
  input: { schema: ConnectionMessageDraftingInputSchema },
  output: { schema: ConnectionMessageDraftingOutputSchema },
  prompt: `You are a professional AI assistant specialized in drafting polite and impactful B2B connection messages.

Draft a concise, professional, and friendly connection message for a business user.

The message should clearly state the user's company and industry, the target company and its industry, and the specific purpose for connecting.
Ensure the tone is respectful and encourages a positive initial interaction.

Here are the details:

My Company Name: {{{myCompanyName}}}
My Company Industry: {{{myCompanyIndustry}}}
Target Company Name: {{{targetCompanyName}}}
Target Company Industry: {{{targetCompanyIndustry}}}
My Purpose for Connecting: {{{myPurposeForConnecting}}}`,
});

const aiAssistedConnectionMessageDraftingFlow = ai.defineFlow(
  {
    name: 'aiAssistedConnectionMessageDraftingFlow',
    inputSchema: ConnectionMessageDraftingInputSchema,
    outputSchema: ConnectionMessageDraftingOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
