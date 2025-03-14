import { VertexAI} from '@google-cloud/vertexai';
import {Document} from '@langchain/core/documents'
import { PredictionServiceClient, helpers, protos } from '@google-cloud/aiplatform';
import { GoogleAuth } from 'google-auth-library';
import fs from 'fs';
import path from 'path';

import pLimit from 'p-limit';


const limit = pLimit(1);

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





const PROJECT_ID = process.env.GOOGLE_PROJECT_ID; // Your GCP Project ID
const LOCATION = process.env.LOCATION_GOOGLE; // e.g., 'us-central1'
const MODEL = 'text-embedding-004'; // Gemini Embedding Model
const API_ENDPOINT = `${LOCATION}-aiplatform.googleapis.com`;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const model = vertexAi.getGenerativeModel({
    model: 'gemini-1.5-flash',
});

const clientOptions = { apiEndpoint: API_ENDPOINT };
const client = new PredictionServiceClient(clientOptions);
const endpoint = `projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}`;

const withRetry = async <T>(fn: () => Promise<T>, retries = 3, delayMs = 8000): Promise<T> => {
    try {
      return await fn();
    } catch (error) {
      if (retries === 0) throw error;
      console.log(`Retrying after ${delayMs}ms...`);
      await delay(delayMs);
      return withRetry(fn, retries - 1, delayMs * 2); // Double the delay each time
    }
  };


export const aiSummariseCommit = async (diff: string )=> {
    return withRetry(async () => {
    const prompt = `You are an expert programmer, and you are trying to summarize a git diff.
    Reminders about the git diff format:
    For every file, there are a few metadata lines, like (for example):
    \`\`\`
    diff --git a/lib/index.js b/lib/index.js
    index aadf691..bfef603 100644
    --- a/lib/index.js
    +++ b/lib/index.js
    \`\`\`
    This means that \`lib/index.js\` was modified in this commit. Note that this is only an example.
    Then there is a specifier of the lines that were modified.
    A line starting with \`+\` means it was added.
    A line that starting with \`-\` means that line was deleted.
    A line that starts with neither \`+\` nor \`-\` is code given for context and better understanding.
    It is not part of the diff.
    [...]
    EXAMPLE SUMMARY COMMENTS:
    \`\`\`
    * Raised the amount of returned recordings from \`10\` to \`100\` [packages/server/recordings_api.ts], [packages/server/constants.ts]
    * Fixed a typo in the github action name [.github/workflows/gpt-commit-summarizer.yml]
    * Moved the \`octokit\` initialization to a separate file [src/octokit.ts], [src/index.ts]
    * Added an OpenAI API for completions [packages/utils/apis/openai.ts]
    * Lowered numeric tolerance for test files
    \`\`\`
    Most commits will have less comments than this examples list.
    The last comment does not include the file names,
    because there were more than two relevant files in the hypothetical commit.
    Do not include parts of the example in your summary.
    It is given only as an example of appropriate comments.`;

    const request = {
        contents: [{
            role: 'user',
            parts: [
                {text: prompt},
                {text: `Please summarise the following diff file: \n\n${diff}`}
            ]
        }]
    };

    const response = await model.generateContent(request);
    const text = response?.response?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) {
        console.log(text);
        return text;

    } else {
        console.error("Failed to generate summary");
        return "Failed to generate summary";
    }
    });
    

}

export async function summarizeCode(doc: Document) {
    return withRetry(async () => {
    console.log("Summarizing code:", doc.metadata.source);
    const code = doc.pageContent.slice(0,10000); //limit to 10k characters
    const prompt =  `You are an intelligent senior software engineer who specialises in onboarding junior software engineers onto projects.You are onboarding a junior software engineer and explaining to them the purpose of the ${doc.metadata.source} file
    Here is the code:`;

    const request = {
        contents: [{
            role: 'user',
            parts: [
                {text: prompt},
                {text: `---\n${code}\n---\nGive a summary no more than 100 words of the code above`}
            ]
        }]
    };

    const response = await model.generateContent(request);
    const text = response?.response?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) {
        console.log(text);
        return text;
    } else {
        console.error("Failed to generate summary");
        return "Failed to generate summary";
    }
    });
}

export async function getEmbeddings(text: string): Promise<number[]> {
    try {
      // Use protobuf helpers to create IValue instances ✅
      const instance=helpers.toValue({content: text});
      const instances: protos.google.protobuf.IValue[] = [instance as protos.google.protobuf.IValue];

      const parameters = helpers.toValue({});
  
      const request: protos.google.cloud.aiplatform.v1.IPredictRequest = {
        endpoint,
        instances,
        parameters,
      };
  
      const [response] = await client.predict(request);
      const predictions = response?.predictions ?? [];
  
      if (predictions.length === 0) {
        console.warn('No embeddings returned');
        return [];
      }
  
      // 🔥 This is the Vertex AI secret sauce for embedding extraction
      const embeddings = predictions.map((p) => {
        const embeddingProto = p?.structValue?.fields?.embeddings;
        const valuesProto = embeddingProto?.structValue?.fields?.values;
        return valuesProto?.listValue?.values?.map((v) => v.numberValue ?? 0) ?? [];
      });
  
      return embeddings[0] ?? [];
    } catch (error) {
      console.error('Vertex AI Embedding Error:', error);
      return [];
    }
  }










// import { Mistral } from '@mistralai/mistralai';





// const apiKey = process.env.MISTRAL_API_KEY;

// const client = new Mistral({apiKey: apiKey});
// export const aiSummariseCommit = async (diff: string )=> {
//     try {
//         const chatResponse = await client.chat.complete({
//             model: 'mistral-large-latest',
//             messages: [
//                 {
//                     role: 'user',

//                     content: `You are an expert programmer. Summarize the following Git diff in bullet points, focusing on key changes and file paths:${diff}`
                    
//                 }
//             ],
//         });
//         console.log("Mistral AI response:", chatResponse);

//         if (chatResponse.choices && chatResponse.choices[0]?.message?.content) {
//             const summary = chatResponse.choices[0].message.content;
//             console.log("Summary generated:", summary);
//             return summary;
//         } else {
//             console.error("No content in response");
//             return "Failed to generate summary";
//         }
//     } catch (error) {
//         console.error("Error during summarization:", error);
//         return "Failed to generate summary";
//     }


// }

// const testDiff = `diff --git a/src/app.ts b/src/app.ts
// index 123456..789abc 100644
// --- a/src/app.ts
// +++ b/src/app.ts
// @@ -10,6 +10,7 @@
//  import { config } from './config';
//  +import { logger } from './utilities';
 
//  const app = express();
//  +app.use(logger());
 
//  app.listen(3000);`;

// aiSummariseCommit(testDiff).then(console.log).catch(console.error);
