import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// AI Assistant configurations for collaborative work
const AI_ASSISTANTS = {
  'asst_sS0Sa5rqQFrrwnwkJ9mULGp0': { // BaoBao
    name: 'BaoBao',
    role: 'Content & Translation Specialist',
    avatar: '🍼',
    systemPrompt: `You are BaoBao, a Content & Translation Specialist. Your expertise is in:
- Content creation and writing
- Thai-English translation
- Message and communication design
- User interface text and labels
- Content strategy and messaging

In group discussions, focus on content quality, clarity, and effective communication.`
  },
  'asst_CO7qtWO5QTfgV0Gyv77XQY8q': { // DeeDee
    name: 'DeeDee', 
    role: 'UX Research Specialist',
    avatar: '🔬',
    systemPrompt: `You are DeeDee, a UX Research Specialist. Your expertise is in:
- User research and interviews
- Usability testing
- User personas and journey mapping
- Research methodology
- Data collection and analysis

In group discussions, focus on user needs, research insights, and evidence-based recommendations.`
  },
  'asst_Pi6FrBRHRpvhwSOIryJvDo3T': { // PungPung
    name: 'PungPung',
    role: 'Data Analysis Specialist', 
    avatar: '📊',
    systemPrompt: `You are PungPung, a Data Analysis Specialist. Your expertise is in:
- Data analysis and interpretation
- Feedback analysis and CSAT scores
- Metrics and KPIs
- Statistical analysis
- Performance insights

In group discussions, focus on data-driven insights, metrics, and analytical perspectives.`
  },
  'asst_4nCaYlt7AA5Ro4pseDCTbKHO': { // FlowFlow
    name: 'FlowFlow',
    role: 'UX/UI Design Specialist',
    avatar: '🎨', 
    systemPrompt: `You are FlowFlow, a UX/UI Design Specialist. Your expertise is in:
- User interface design
- User experience design
- Visual design and aesthetics
- Design systems and components
- Prototyping and wireframing

In group discussions, focus on design solutions, user experience, and visual implementation.`
  }
};

export async function POST(request: NextRequest) {
  try {
    console.log('Group chat API called');
    
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      console.log('No auth token found');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET!) as {
        userId: string;
      };
      console.log('Token verified for user:', decoded.userId);
    } catch (error) {
      console.log('Token verification failed:', error);
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const body = await request.json();
    console.log('Request body:', body);
    
    const { message, conversationId } = body;

    if (!message || !conversationId) {
      console.log('Missing required fields:', { message: !!message, conversationId: !!conversationId });
      return NextResponse.json({ error: "Message and conversationId are required" }, { status: 400 });
    }

    // Step 1: Initial Analysis - Each AI provides their initial thoughts
    console.log('Starting collaborative group chat analysis...');
    
    const initialThoughts = await Promise.all(
      Object.entries(AI_ASSISTANTS).map(async ([assistantId, config]) => {
        try {
          // Create a new thread for this assistant
          const thread = await openai.beta.threads.create();
          
          // Add the user message to the thread
          await openai.beta.threads.messages.create(thread.id, {
            role: 'user',
            content: `As ${config.name} (${config.role}), provide your initial analysis and thoughts on this user question:

"${message}"

Please provide:
1. Your specific perspective on this question
2. Key insights from your area of expertise
3. Initial recommendations or suggestions
4. Questions you might have for other team members

Keep your response focused and concise (2-3 paragraphs max).`
          });

          // Run the assistant
          const response = await openai.beta.threads.runs.createAndPoll(thread.id, {
            assistant_id: assistantId
          });

          const messages = await openai.beta.threads.messages.list(response.thread_id);
          const latestMessage = messages.data[0];
          
          return {
            assistantId,
            name: config.name,
            avatar: config.avatar,
            role: config.role,
            initialThought: latestMessage.content[0]?.type === 'text' ? latestMessage.content[0].text.value : 'No response'
          };
        } catch (error) {
          console.error(`Error getting initial thoughts from ${config.name}:`, error);
          console.error('Error details:', {
            assistantId,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
          });
          return {
            assistantId,
            name: config.name,
            avatar: config.avatar,
            role: config.role,
            initialThought: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          };
        }
      })
    );

    // Step 2: Cross-Discussion - AIs discuss each other's thoughts
    console.log('Starting cross-discussion phase...');
    
    const discussionRounds = [];
    const assistantNames = Object.values(AI_ASSISTANTS).map(a => a.name);
    
    // Create discussion context
    const discussionContext = initialThoughts.map(thought => 
      `**${thought.name} (${thought.role})**: ${thought.initialThought}`
    ).join('\n\n');

    const crossDiscussion = await Promise.all(
      Object.entries(AI_ASSISTANTS).map(async ([assistantId, config]) => {
        try {
          // Create a new thread for this assistant
          const thread = await openai.beta.threads.create();
          
          // Add the user message to the thread
          await openai.beta.threads.messages.create(thread.id, {
            role: 'user',
            content: `As ${config.name}, you've seen the initial thoughts from all team members:

${discussionContext}

Now provide your thoughts on:
1. What insights do you agree with from other team members?
2. What additional perspectives can you add?
3. How can your expertise complement what others have suggested?
4. Any concerns or different viewpoints?
5. How should we proceed with the final recommendation?

Respond as if you're in a team meeting discussing this together.`
          });

          // Run the assistant
          const response = await openai.beta.threads.runs.createAndPoll(thread.id, {
            assistant_id: assistantId
          });

          const messages = await openai.beta.threads.messages.list(response.thread_id);
          const latestMessage = messages.data[0];
          
          return {
            assistantId,
            name: config.name,
            avatar: config.avatar,
            discussion: latestMessage.content[0]?.type === 'text' ? latestMessage.content[0].text.value : 'No response'
          };
        } catch (error) {
          console.error(`Error in cross-discussion from ${config.name}:`, error);
          return {
            assistantId,
            name: config.name,
            avatar: config.avatar,
            discussion: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          };
        }
      })
    );

    // Step 3: Final Synthesis - Create a comprehensive final answer
    console.log('Creating final synthesis...');
    
    const synthesisContext = `
**INITIAL THOUGHTS:**
${initialThoughts.map(thought => 
  `**${thought.name} (${thought.role})**: ${thought.initialThought}`
).join('\n\n')}

**TEAM DISCUSSION:**
${crossDiscussion.map(discussion => 
  `**${discussion.name}**: ${discussion.discussion}`
).join('\n\n')}
`;

    const finalSynthesis = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{
        role: 'system',
        content: `You are synthesizing a comprehensive final answer from a collaborative AI team discussion. 

The team consists of:
- BaoBao (Content & Translation Specialist)
- DeeDee (UX Research Specialist) 
- PungPung (Data Analysis Specialist)
- FlowFlow (UX/UI Design Specialist)

Create a well-structured final response that:
1. Acknowledges the collaborative process
2. Synthesizes the best insights from all team members
3. Provides a comprehensive, actionable answer
4. Shows how different perspectives contributed to the solution
5. Maintains a professional, helpful tone

Format the response with clear sections and make it easy to read.`
      }, {
        role: 'user',
        content: `Based on this collaborative team discussion, provide the final comprehensive answer to the user's question: "${message}"

${synthesisContext}`
      }],
      max_tokens: 2000,
      temperature: 0.7
    });

    const finalAnswer = finalSynthesis.choices[0]?.message?.content || 'No final answer generated';

    // Return the complete collaborative response
    return NextResponse.json({
      success: true,
      collaborativeResponse: {
        userQuestion: message,
        initialThoughts,
        crossDiscussion,
        finalAnswer,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Group chat error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    return NextResponse.json(
      { 
        error: 'Failed to process group chat request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
