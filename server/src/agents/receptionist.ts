import { RealtimeAgent, tool } from '@openai/agents';
import { getSupervisorResponse } from './supervisor';

// Placeholder company config - replace with actual config later
const COMPANY_CONFIG = {
  name: "Demo Company",
  phone: "(555) 123-4567",
  email: "info@demo.com",
};

const COMPANY_BRIEF = `
This is a placeholder company brief. Replace with actual company information.
`;

// ✅ FIXED: Use tool() helper instead of manual tool definition
const getNextResponseFromSupervisor = tool({
  name: 'getNextResponseFromSupervisor',
  description: 'Get a response from the supervisor agent for complex queries like pricing, availability, or appointment booking. Use this when you need to check calendars, databases, or provide detailed information you don\'t have.',
  parameters: {
    type: 'object',
    properties: {
      relevantContextFromLastUserMessage: {
        type: 'string',
        description: 'Key information from the most recent user message. Provide context the supervisor needs to answer the question.',
      },
    },
    required: ['relevantContextFromLastUserMessage'],
  },
  execute: async (input, details) => {
    const { relevantContextFromLastUserMessage } = input;

    // SDK provides conversation history automatically
    const history = details?.context?.history ?? [];

    try {
      const response = await getSupervisorResponse(history, relevantContextFromLastUserMessage);
      return { nextResponse: response };
    } catch (error) {
      console.error('Supervisor error:', error);
      return {
        nextResponse: "I apologize, I'm having trouble processing that. Could you rephrase your question?",
      };
    }
  },
});

export function createReceptionistAgent(): RealtimeAgent {
  const instructions = `
You are a professional AI receptionist for ${COMPANY_CONFIG.name}.

<company_brief>
${COMPANY_BRIEF}
</company_brief>

Your role:
- Greet callers warmly: "Hello, thank you for calling ${COMPANY_CONFIG.name}. How can I help you today?"
- Use the company brief above to answer questions about services, hours, location, policies
- Collect caller information: name, phone number, reason for calling
- For complex queries (appointments, availability, detailed pricing), say "Let me check that for you" and use the getNextResponseFromSupervisor tool
- Maintain professional, helpful tone
- If information isn't in the brief, say "Let me check that for you" and use supervisor tool

Company Contact Info:
- Phone: ${COMPANY_CONFIG.phone}
- Email: ${COMPANY_CONFIG.email}

When you need the supervisor's help, call getNextResponseFromSupervisor with context from the user's message.
`;

  return new RealtimeAgent({
    name: 'receptionist',
    voice: 'sage',
    instructions,
    tools: [getNextResponseFromSupervisor],
  });
}
