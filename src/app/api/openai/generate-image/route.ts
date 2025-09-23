import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      jwt.verify(token, process.env.NEXTAUTH_SECRET!);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { prompt, size = "1024x1024", quality = "standard", style = "vivid" } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Validate size parameter
    const validSizes = ["256x256", "512x512", "1024x1024", "1792x1024", "1024x1792"];
    if (!validSizes.includes(size)) {
      return NextResponse.json({ error: 'Invalid size parameter' }, { status: 400 });
    }

    // Validate quality parameter
    const validQualities = ["standard", "hd"];
    if (!validQualities.includes(quality)) {
      return NextResponse.json({ error: 'Invalid quality parameter' }, { status: 400 });
    }

    // Validate style parameter
    const validStyles = ["vivid", "natural"];
    if (!validStyles.includes(style)) {
      return NextResponse.json({ error: 'Invalid style parameter' }, { status: 400 });
    }

    // Generate image using OpenAI DALL-E
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      size: size as "256x256" | "512x512" | "1024x1024" | "1792x1024" | "1024x1792",
      quality: quality as "standard" | "hd",
      style: style as "vivid" | "natural",
      n: 1,
    });

    const imageUrl = response.data?.[0]?.url;
    const revisedPrompt = response.data?.[0]?.revised_prompt;

    if (!imageUrl || !response.data || response.data.length === 0) {
      return NextResponse.json({ error: 'Failed to generate image' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      imageUrl,
      revisedPrompt,
      originalPrompt: prompt
    });

  } catch (error) {
    console.error('Image generation error:', error);
    
    if (error instanceof Error) {
      // Handle OpenAI API errors
      if (error.message.includes('content_policy_violation')) {
        return NextResponse.json({ 
          error: 'The prompt violates OpenAI\'s content policy. Please try a different prompt.' 
        }, { status: 400 });
      }
      
      if (error.message.includes('rate_limit')) {
        return NextResponse.json({ 
          error: 'Rate limit exceeded. Please try again later.' 
        }, { status: 429 });
      }
    }

    return NextResponse.json({ 
      error: 'Failed to generate image. Please try again.' 
    }, { status: 500 });
  }
}
