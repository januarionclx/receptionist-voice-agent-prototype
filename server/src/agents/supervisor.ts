import OpenAI from 'openai';
import { z } from 'zod';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ✅ FIXED: Added iteration limit to prevent infinite loops
const MAX_SUPERVISOR_ITERATIONS = 10;

// Mock tool schemas for Week 1 testing
// Week 2: Replace with real GHL tools via MCP (ghl_create_contact, ghl_check_calendar, etc.)
// MCP servers expose their native schemas - no normalization needed
const checkAvailabilitySchema = z.object({
  start: z.string().describe('Start date/time in ISO 8601 UTC format'),
  end: z.string().describe('End date/time in ISO 8601 UTC format'),
  serviceType: z.string().describe('Service type (e.g., oil change, brake repair)'),
  timeZone: z.string().optional().describe('IANA timezone'),
});

const bookAppointmentSchema = z.object({
  date: z.string(),
  time: z.string(),
  customerName: z.string(),
  customerPhone: z.string(),
  serviceType: z.string(),
  notes: z.string().optional(),
});

const lookupCustomerSchema = z.object({
  phone: z.string().describe('Customer phone number'),
});

// Mock tool implementations for Week 1 testing
// Week 2: These will be replaced by MCP tools from GoHighLevel server
async function checkAvailability(params: z.infer<typeof checkAvailabilitySchema>) {
  // TODO: Week 2 - Use MCP client to call ghl_check_calendar()
  return {
    status: 'success',
    availableSlots: [
      { time: '09:00', available: true },
      { time: '11:00', available: true },
      { time: '14:00', available: true },
      { time: '16:00', available: true },
    ],
    message: 'Mock data - will be replaced with GoHighLevel MCP',
  };
}

async function bookAppointment(params: z.infer<typeof bookAppointmentSchema>) {
  // TODO: Week 2 - Use MCP client to call ghl_book_appointment()
  return {
    confirmationNumber: 'MOCK-' + Math.random().toString(36).substring(7).toUpperCase(),
    appointment: params,
    message: 'Appointment booked successfully (MOCK)',
  };
}

async function lookupCustomer(params: z.infer<typeof lookupCustomerSchema>) {
  // TODO: Week 2 - Use MCP client to call ghl_get_contact()
  return {
    found: false,
    message: 'Customer lookup not yet implemented',
  };
}

export async function getSupervisorResponse(
  conversationHistory: any[],
  context?: string
): Promise<string> {
  const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
    {
      type: 'function',
      function: {
        name: 'checkAvailability',
        description: 'Check available appointment slots for a given date and service type',
        parameters: checkAvailabilitySchema,
      },
    },
    {
      type: 'function',
      function: {
        name: 'bookAppointment',
        description: 'Book an appointment for a customer',
        parameters: bookAppointmentSchema,
      },
    },
    {
      type: 'function',
      function: {
        name: 'lookupCustomer',
        description: 'Look up customer information by phone number',
        parameters: lookupCustomerSchema,
      },
    },
  ];

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: `You are the supervisor agent for the AI receptionist system.

Your role:
- Handle complex queries that the receptionist agent defers to you
- Use tools to check availability, book appointments, lookup customers
- Provide accurate, detailed information
- Format responses in a way the receptionist can read naturally to the caller

When calling tools:
- checkAvailability: Use this before booking appointments
- bookAppointment: Only after confirming availability and getting customer details
- lookupCustomer: Check if we have history with this customer

Return responses that the receptionist can speak verbatim to the caller. Keep responses brief (2-3 sentences max) and conversational.`,
    },
    {
      role: 'user',
      content: `Conversation: ${JSON.stringify(conversationHistory)}\n\nContext: ${context || 'None'}`,
    },
  ];

  let iterations = 0;

  try {
    let response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      tools,
      tool_choice: 'auto',
    });

    let assistantMessage = response.choices[0].message;

    // ✅ FIXED: Added iteration limit to prevent infinite loops
    while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      iterations++;

      if (iterations > MAX_SUPERVISOR_ITERATIONS) {
        console.error('Supervisor exceeded max iterations');
        return 'I apologize, but I encountered an issue processing your request. Please try again or rephrase your question.';
      }

      messages.push(assistantMessage);

      // Execute each tool call
      for (const toolCall of assistantMessage.tool_calls) {
        try {
          // ✅ FIXED: Error handling for JSON parsing
          const args = JSON.parse(toolCall.function.arguments);
          let toolResult;

          switch (toolCall.function.name) {
            case 'checkAvailability':
              toolResult = await checkAvailability(args);
              break;
            case 'bookAppointment':
              toolResult = await bookAppointment(args);
              break;
            case 'lookupCustomer':
              toolResult = await lookupCustomer(args);
              break;
            default:
              toolResult = { error: 'Unknown tool' };
          }

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolResult),
          });
        } catch (error) {
          console.error('Tool execution error:', error);
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify({ error: 'Tool execution failed' }),
          });
        }
      }

      // Get next response
      response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        tools,
        tool_choice: 'auto',
      });

      assistantMessage = response.choices[0].message;
    }

    return assistantMessage.content || 'I apologize, I couldn\'t process that request.';
  } catch (error: any) {
    console.error('Supervisor agent error:', error);

    // ✅ FIXED: Specific error handling
    if (error.code === 'rate_limit_exceeded') {
      return 'Our system is experiencing high demand. Please try again in a moment.';
    } else if (error.code === 'invalid_api_key') {
      console.error('CRITICAL: Invalid OpenAI API key');
      return 'I apologize, we\'re experiencing technical difficulties. Please call back later.';
    }

    return 'I apologize, I\'m having trouble processing that request. Could you rephrase?';
  }
}
