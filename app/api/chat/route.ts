import { streamText, tool, appendResponseMessages } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import * as cheerio from 'cheerio';

// Define the providers using environment variables
const groq = createOpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY || 'dummy',
});

const openRouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY || 'dummy',
});

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY || 'dummy',
});

// The custom HF Endpoint for Orvansi Beta POC
const hfEndpoint = createOpenAI({
  baseURL: process.env.HF_ENDPOINT_URL || 'https://api-inference.huggingface.co/models/your-model', // Update this later if needed
  apiKey: process.env.HF_API_KEY || 'dummy',
});

export async function POST(req: Request) {
  const { messages, model } = await req.json();

  let selectedModel;
  let systemPrompt = `You are Orvansi, a highly intelligent student AI. You must ALWAYS output your step-by-step thinking inside <thinking></thinking> tags before giving your final answer. Provide any code in proper markdown code blocks.`;

  switch (model) {
    case 'orvansi-0.1':
      selectedModel = groq('llama-3.1-8b-instant');
      systemPrompt = `You are Orvansi version 0.1 (Fastest). Provide very quick, accurate answers. \n\n${systemPrompt}`;
      break;
    case 'orvansi-1.2':
      selectedModel = openRouter('meta-llama/llama-3.1-70b-instruct');
      systemPrompt = `You are Orvansi version 1.2 (All Around). Provide detailed, comprehensive answers. \n\n${systemPrompt}`;
      break;
    case 'orvansi-beta':
      // The custom fine-tuned model via Hugging Face inference endpoint
      selectedModel = hfEndpoint('tgi'); // 'tgi' is standard for HF endpoints, model name is handled by baseURL
      systemPrompt = `You are Orvansi (Beta). You are a highly specialized Hinglish student AI. \n\n${systemPrompt}`;
      break;
    case 'orvansi-2.1':
    default:
      selectedModel = google('models/gemini-1.5-pro-latest');
      systemPrompt = `You are Orvansi version 2.1 (Advanced). You excel at advanced math, coding, and logical reasoning. You have access to tools for running Python code and searching the web. ALWAYS VERIFY YOUR WORK using tools. \n\n${systemPrompt}`;
      break;
  }

  // Set up the specific tools for Orvansi 2.1
  const tools = model === 'orvansi-2.1' ? {
    runPython: tool({
      description: 'Execute Python code in a secure cloud sandbox and return the console output. Use this to verify math, run scripts, or test algorithms before giving the final answer to the user.',
      parameters: z.object({
        code: z.string().describe('The raw Python 3 code to execute. Do not include markdown ticks.'),
      }),
      execute: async ({ code }) => {
        try {
          const res = await fetch('https://emkc.org/api/v2/piston/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              language: 'python',
              version: '3.10.0',
              files: [{ content: code }]
            })
          });
          const data = await res.json();
          if (data.compile?.stderr) return `Compile Error: ${data.compile.stderr}`;
          if (data.run?.stderr) return `Runtime Error: ${data.run.stderr}`;
          return data.run?.stdout || 'Execution finished with no output.';
        } catch (e: any) {
          return `Error running python: ${e.message}`;
        }
      },
    }),
    webSearch: tool({
      description: 'Search the web for up-to-date information. Returns text snippets from DuckDuckGo HTML results.',
      parameters: z.object({
        query: z.string().describe('The search query string.'),
      }),
      execute: async ({ query }) => {
        try {
          // Custom free search scraper tool using DDG HTML
          const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
          });
          const html = await res.text();
          const $ = cheerio.load(html);
          
          let results = '';
          $('.result__snippet').each((i, el) => {
            if (i < 5) results += $(el).text().trim() + '\n\n';
          });
          
          return results || 'No results found.';
        } catch (e: any) {
          return `Error searching the web: ${e.message}`;
        }
      },
    }),
  } : undefined;

  try {
    const result = await streamText({
      model: selectedModel,
      system: systemPrompt,
      messages,
      tools,
      maxSteps: 3, // Allow the model to run tools in loops
    });

    return result.toDataStreamResponse();
  } catch (error) {
    // If the primary provider fails, we can add a fallback logic block here to cycle to the next one.
    // For now, returning the error gracefully for the UI to display.
    console.error("API Error:", error);
    return new Response(JSON.stringify({ error: "Provider failed. Please check your API keys or try a different Orvansi version." }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
