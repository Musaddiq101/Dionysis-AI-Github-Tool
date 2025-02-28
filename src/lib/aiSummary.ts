import { Mistral } from '@mistralai/mistralai';

const apiKey = process.env.MISTRAL_API_KEY;

const client = new Mistral({apiKey: apiKey});
export const aiSummariseCommit = async (diff: string )=> {
    try {
        const chatResponse = await client.chat.complete({
            model: 'mistral-large-latest',
            messages: [
                {
                    role: 'user',

                    content: `You are an expert programmer. Summarize the following Git diff in bullet points, focusing on key changes and file paths:${diff}`
                    
                }
            ],
        });
        console.log("Mistral AI response:", chatResponse);

        if (chatResponse.choices && chatResponse.choices[0]?.message?.content) {
            const summary = chatResponse.choices[0].message.content;
            console.log("Summary generated:", summary);
            return summary;
        } else {
            console.error("No content in response");
            return "Failed to generate summary";
        }
    } catch (error) {
        console.error("Error during summarization:", error);
        return "Failed to generate summary";
    }


}

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
