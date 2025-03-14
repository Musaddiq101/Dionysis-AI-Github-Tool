'use server';
import { streamText } from 'ai';
import { createStreamableValue } from 'ai/rsc';
import { getEmbeddings } from '@/lib/aiSummary';
import { db } from '@/server/db';
import { PredictionServiceClient,  helpers, protos } from '@google-cloud/aiplatform';
import { VertexAI} from '@google-cloud/vertexai';
import { GoogleAuth } from 'google-auth-library';

export const getGCPCredentials = () => {
  // For Vercel, use environment variables
  if (process.env.GCP_PRIVATE_KEY) {
    return {
      credentials: {
        client_email: process.env.GCP_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GCP_PRIVATE_KEY // Fix newline characters
      },
      projectId: process.env.GCP_PROJECT_ID,
    };
  }
  // For local development, use gcloud CLI or default credentials
  return {};
};

const vertexAi = new VertexAI({
    project:  process.env.GOOGLE_PROJECT_ID as string,
    location: process.env.LOCATION_GOOGLE as string,
    googleAuthOptions: getGCPCredentials()
});



const model = vertexAi.getGenerativeModel({
    model: 'gemini-1.5-flash',
});


export async function askQuestion(question: string, projectId: string) {
  const stream = createStreamableValue();

  try {
    // Step 1: Get embeddings for the question
    const queryVector = await getEmbeddings(question);
    const vectorQuery = `[${queryVector.join(',')}]`;
    console.log('Creating query for getting similarity');

    // Step 2: Query the database for similar files
    
    const result = await db.$queryRaw`
      SELECT "fileName", "sourceCode", "summary",
      1 - ("summaryEmbedding" <=> ${vectorQuery}::vector) AS similarity
      FROM "SourceCodeEmbedding"
      WHERE 1 - ("summaryEmbedding" <=> ${vectorQuery}::vector) > 0.5
      AND "projectId" = ${projectId}
      ORDER BY similarity DESC
      LIMIT 10
    ` as { fileName: string; sourceCode: string; summary: string }[];
   

    console.log(`Found ${result.length} matching documents`);

    // Step 3: Build the context from the retrieved files
    let context = '';
    for (const doc of result) {
      context += `source: ${doc.fileName}\ncode content: ${doc.sourceCode}\nsummary of file: ${doc.summary}\n\n`;
    }

    // Step 4: Construct your prompt with context and the question
    const prompt = `
You are an AI code assistant who answers questions about the codebase. Your target audience is a technical intern looking to understand the code.
If the question is about code or a specific file, provide detailed, step-by-step explanations with code snippets.
START CONTEXT BLOCK
${context}
END OF CONTEXT BLOCK

START QUESTION
${question}
END OF QUESTION

Please answer in markdown syntax.
    `;

    const request = {
        contents: [{
            role: 'user',
            parts: [
                {text: prompt},
                {text: `Please answer the following question: \n\n${question}`}
            ]
        }]
    }

    const response = await model.generateContent(request);
    const answer = response?.response?.candidates?.[0]?.content?.parts?.[0]?.text;

    // Step 7: Update your streamable value.
    // If you require streaming, you might simulate it by splitting the answer into chunks.
    stream.update(answer);
    stream.done();

    // Step 8: Return the streamable output and file references.
    return {
      output: stream.value,
      filesReferences: result,
    };
  } catch (e) {
    console.error('Error in askQuestion:', e);
    stream.error('An error occurred while processing your question.');
    throw e;
  }
}
