import {GithubRepoLoader } from '@langchain/community/document_loaders/web/github'
import {Document} from '@langchain/core/documents'
import { summarizeCode, getEmbeddings } from './aiSummary'
import {db} from '@/server/db'

export const loadGithubRepo = async (githubUrl: string, githubToken?: string) => {
console.log('loading github repo', githubUrl)
try {
    const loader = new GithubRepoLoader(githubUrl, {
        accessToken: githubToken || "",
        branch: "main",
        ignoreFiles: ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb'],
        recursive: true,
        unknown: 'warn',
        maxConcurrency: 5
    })
    console.log('loading docs')
    const docs = await loader.load()
    console.log('docs loaded', docs)
    return docs
    } catch (error) {
        console.error("Error loading github repo", error)
    }

}


export const indexGithubRepo = async ( projectId: string, githubUrl: string, githubToken?: string) => {
    const docs = await loadGithubRepo(githubUrl, githubToken)
    // index the documents
    if (!docs) {
        console.error("No documents loaded from the GitHub repository");
        return;
    }
    const allEmbeddings = await generateEmbeddings(docs)
    await Promise.allSettled(allEmbeddings.map(async (embedding, index) => {
        console.log(`processing ${index} of ${allEmbeddings.length}`)
        if (!embedding) {
            console.error("embedding is null")
            return
        }
        try {
            const sourceCodeEmbedding = await db.sourceCodeEmbedding.create({
                data: {
                    summary: embedding.summary,
                    sourceCode: embedding.sourceCode,
                    fileName: embedding.fileName,
                    projectId,
                },
            });
            console.log("Inserted Base Record:", sourceCodeEmbedding);
        
            await db.$executeRaw`
                UPDATE "SourceCodeEmbedding"
                SET "summaryEmbedding" = ${embedding.embedding}::vector
                WHERE "id" = ${sourceCodeEmbedding.id}
            `;
            console.log("Updated Embedding for ID:", sourceCodeEmbedding.id);
        } catch (error) {
            console.error("Error inserting or updating embedding:", error);
        }

    }))
}

const generateEmbeddings = async (docs: Document[]) => {
    //look through files and get AI summary and then create embedding vectoe of the summary

    return await Promise.all(docs.map(async (doc) =>{
        const summary = await summarizeCode(doc)
        const embedding = await getEmbeddings(summary)
        return {
            summary, 
            embedding,
            sourceCode: JSON.parse(JSON.stringify(doc.pageContent)),
            fileName: doc.metadata.source 
        }
    }))

}







// loader retuurns an array of document objects
// Document {
//     pageContent: "body {\n  text-align: center;\n  background-color: #283149;\n}\n\nh1 {\n  font-size: 5rem;\n  color: #DBEDF3;\n  font-family: \"Arvo\", cursive;\n  text-shadow: 3px 0 #DA0463;\n\n}\n\nfooter {\n  color: #DBEDF3;\n  font-family: sans-serif;\n}\n\n.w {\n  background-image: url(\"./images/tom1.png\");\n}\n\n.a {\n  background-image: url(\"./images/tom2.png\");\n}\n\n.s {\n  background-image: url(\"./images/tom3.png\");\n}\n\n.d {\n  background-image: url(\"./images/tom4.png\");\n}\n\n.j {\n  background-image: url(\"./images/snare.png\");\n}\n\n.k {\n  background-image: url(\"./images/crash.png\");\n}\n\n.l {\n  background-image: url(\"./images/kick.png\");\n}\n\n.set {\n  margin: 10% auto;\n}\n\n.game-over {\n  background-color: red;\n  opacity: 0.8;\n}\n\n.pressed {\n  box-shadow: 0 3px 4px 0 #DBEDF3;\n  opacity: 0.5;\n}\n\n.red {\n  color: red;\n}\n\n.drum {\n  outline: none;\n  border: 10px solid #404B69;\n  font-size: 5rem;\n  font-family: 'Arvo', cursive;\n  line-height: 2;\n  font-weight: 900;\n  color: #DA0463;\n  text-shadow: 3px 0 #DBEDF3;\n  border-radius: 15px;\n  display: inline-block;\n  width: 150px;\n  height: 150px;\n  text-align: center;\n  margin: 10px;\n  background-color: white;\n}\n",
//     metadata: {
//       source: "styles.css",
//       repository: "https://github.com/Musaddiq101/drum-kit",
//       branch: "main",
//     },
//     id: undefined,
//   }