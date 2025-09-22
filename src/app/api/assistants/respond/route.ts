import { NextRequest, NextResponse } from "next/server";

// Calls OpenAI Responses with file_search enabled for Assistants
export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });

    const { assistantId, message, fileIds, imageIds } = await req.json();
    console.log('API Request:', { assistantId, message: message?.substring(0, 100) + '...', fileIds, imageIds });
    
    if (!message) return NextResponse.json({ error: "message required" }, { status: 400 });

    // Prepare doc attachments
    const docAttachments = Array.isArray(fileIds)
      ? fileIds.map((id: string) => ({ file_id: id }))
      : [];

    // Build content (text + optional images)
    const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [ { type: "input_text", text: message } ];
    if (Array.isArray(imageIds) && imageIds.length > 0) {
      for (const id of imageIds) {
        console.log('Adding image with file ID:', id);
        content.push({ type: "input_image", image_url: { url: `openai://file-${id}` } });
      }
    }

    let body: {
      model: string;
      instructions?: string;
      tools?: Array<{ type: string; file_search?: { max_num_results: number } }>;
      tool_choice?: string;
      input: Array<{
        role: string;
        content: Array<{ type: string; text?: string; image_url?: { url: string } }>;
        attachments?: Array<{ file_id: string }>;
      }>;
    };
    if (assistantId) {
      // Fetch assistant to obtain its model/instructions/tools (v2 requires model)
      const asstResp = await fetch(`https://api.openai.com/v1/assistants/${assistantId}` , {
        headers: { Authorization: `Bearer ${apiKey}`, 'OpenAI-Beta': 'assistants=v2' },
      });
      const asst = await asstResp.json().catch(()=>({}));
      const mergedTools = Array.isArray(asst.tools) ? [...asst.tools] : [];
      // Only add file_search tool if there are actual file attachments
      if (docAttachments.length > 0 && !mergedTools.find((t: { type: string })=>t?.type==='file_search')) {
        mergedTools.push({ 
          type: 'file_search'
        });
      }
      body = {
        model: asst.model || process.env.OPENAI_ASSISTANTS_MODEL || 'gpt-4o-mini',
        instructions: asst.instructions || undefined,
        tools: mergedTools.length ? mergedTools : undefined,
        tool_choice: mergedTools.length ? 'auto' : undefined,
        input: [
          {
            role: 'user',
            content,
            ...(docAttachments.length ? { attachments: docAttachments } : {}),
          },
        ],
      };
    } else {
      // Fallback: plain model with optional file_search
      body = {
        model: process.env.OPENAI_ASSISTANTS_MODEL || 'gpt-4o-mini',
        input: [
          { role: 'user', content, ...(docAttachments.length ? { attachments: docAttachments } : {}) },
        ],
        ...(docAttachments.length > 0 ? { 
          tools: [ { 
            type: 'file_search'
          } ], 
          tool_choice: 'auto' 
        } : {}),
      };
    }

    console.log('Creating thread and run with body:', JSON.stringify(body, null, 2));

    // Create a thread with the messages
    const threadResp = await fetch("https://api.openai.com/v1/threads", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "assistants=v2",
      },
      body: JSON.stringify({
        messages: body.input.map(input => {
          console.log('Processing input with content:', input.content.length, 'items');

          // Text items from the input
          const textItems = input.content
            .map(c => (c.type === 'input_text' ? { type: 'text', text: c.text } : null))
            .filter(Boolean);

          // Image items from uploaded file ids (use image_file)
          const imageItems = Array.isArray(imageIds)
            ? imageIds.map((id: string) => ({ type: 'image_file', image_file: { file_id: id } }))
            : [];

          return {
            role: input.role,
            content: [...(textItems as Array<{ type: string; text?: string }>), ...imageItems],
          };
        })
      }),
    });

    const thread = await threadResp.json();
    if (!threadResp.ok) {
      console.log('Thread creation failed:', thread);
      return NextResponse.json({ error: thread?.error?.message || "Thread creation failed" }, { status: threadResp.status });
    }

    console.log('Thread created:', thread.id);

    // Create and run the assistant
    const runResp = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "assistants=v2",
      },
      body: JSON.stringify({
        assistant_id: assistantId,
        ...(body.instructions ? { instructions: body.instructions } : {}),
        ...(body.model ? { model: body.model } : {})
        // Removed attachments from run - they're now in the message
      }),
    });

    const run = await runResp.json();
    if (!runResp.ok) {
      console.log('Run creation failed:', run);
      return NextResponse.json({ error: run?.error?.message || "Run creation failed" }, { status: runResp.status });
    }

    console.log('Run created:', run.id);

    // Poll for completion
    let runStatus = run;
    while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusResp = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "OpenAI-Beta": "assistants=v2",
        },
      });
      runStatus = await statusResp.json();
      console.log('Run status:', runStatus.status);
    }

    if (runStatus.status !== 'completed') {
      console.log('Run failed with status:', runStatus);
      return NextResponse.json({ error: `Run failed with status: ${runStatus.status}` }, { status: 500 });
    }

    // Get the messages
    const messagesResp = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "OpenAI-Beta": "assistants=v2",
      },
    });

    const messages = await messagesResp.json();
    console.log('Messages retrieved:', messages.data?.length);
    
    // Get the assistant's latest message
    type ThreadMessage = { role?: string; content?: Array<{ text?: { value?: string } }> };
    const assistantMessage = (messages.data as ThreadMessage[] | undefined)?.find((msg: ThreadMessage) => msg.role === 'assistant');
    const text = assistantMessage?.content?.[0]?.text?.value || "No response";
    
    return NextResponse.json({ text, openai: { thread_id: thread.id, run_id: run.id } });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}


