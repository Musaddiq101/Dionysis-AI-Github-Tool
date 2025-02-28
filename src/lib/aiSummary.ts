import { VertexAI} from '@google-cloud/vertexai';

const vertexAi = new VertexAI({
    project: process.env.GOOGLE_PROJECT_ID as string,
    location: process.env.LOCATION_GOOGLE as string,
});

const model = vertexAi.getGenerativeModel({
    model: 'gemini-1.5-flash',
});

export const aiSummariseCommit = async (diff: string )=> {
    
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
