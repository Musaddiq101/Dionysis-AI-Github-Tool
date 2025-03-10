import { db } from "@/server/db";
import axios from "axios";
import { Octokit } from "octokit";
import { aiSummariseCommit } from "./aiSummary";

const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
});
// id                 String   @id @default(cuid())
// commitMessage      String
// commitHash         String
// commitAuthorName   String
// commitAuthorAvatar String
// commitDate         DateTime
// summary            String

type response = {
    commitHash: string;
    commitMessage: string;
    commitAuthorName: string;
    commitAuthorAvatar: string;
    commitDate: string;
};

export const getCommitHashes = async (
    githubUrl: string,
): Promise<response[]> => {
    const [owner, repo] = githubUrl.split("/").slice(3, 5);
    if (!owner || !repo) {
        throw new Error("Invalid github url")
    }
    const { data } = await octokit.rest.repos.listCommits({
        owner,
        repo,
    })
    //   need commit author, commit message, commit hash and commit time
    const sortedCommits = data.sort(
        (a: any, b: any) =>
            new Date(b.commit.author.date).getTime() -
            new Date(a.commit.author.date).getTime(),
    ) as any[];

    return sortedCommits.slice(0, 10).map((commit: any) => ({
        commitHash: commit.sha as string,
        commitMessage: commit.commit.message ?? "",
        commitAuthorName: commit.commit?.author?.name ?? "",
        commitAuthorAvatar: commit.author?.avatar_url ?? "",
        commitDate: commit.commit?.author?.date ?? "",
    }));
};

export const pollCommits = async (projectId: string) => {
    const { project, githubUrl } = await fetchProjectGitHubUrl(projectId);
    const commitHashes = await getCommitHashes(project?.githubUrl ?? "");
    const unprocessedCommits = await filterUnprocessedCommits(projectId, commitHashes);
    const summariesResponse = await Promise.allSettled(
        unprocessedCommits.map((hash) => {
            console.log("Summarising commit", hash.commitHash);
            const sum =  summariseCommit(githubUrl, hash.commitHash);
            console.log("Summar: ", sum)
            return sum;
        }),
    );
    const summaries = summariesResponse.map((summary) => {
        console.log(summary);
        if (summary.status === "fulfilled") {
            return summary.value as string;
        }
    });
    const commits = await db.commit.createMany({
        data: summaries.map((summary, idx) => ({
            projectId: projectId,
            commitHash: unprocessedCommits[idx]!.commitHash,
            summary: summary ?? "No summary generated",
            commitAuthorName: unprocessedCommits[idx]!.commitAuthorName,
            commitDate: unprocessedCommits[idx]!.commitDate,
            commitMessage: unprocessedCommits[idx]!.commitMessage,
            commitAuthorAvatar: unprocessedCommits[idx]!.commitAuthorAvatar,
        })),
    });
    return commits;
};

async function fetchProjectGitHubUrl(projectId: string) {
    const project = await db.project.findUnique({
        where: {
            id: projectId
        }, select: {
            githubUrl: true
        }
    });
    const githubUrl = project?.githubUrl ?? "";
    return { project, githubUrl };
}

async function summariseCommit(githubUrl: string, commitHash: string) {
    const { data } = await axios.get(
        `${githubUrl}/commit/${commitHash}.diff`,
        {
            headers: {
                Accept: "application/vnd.github.v3.diff", 
                Authorization: `Bearer ${process.env.GITHUB_TOKEN}`
            },
        }
    );
    return await aiSummariseCommit(data) || ""
}

async function filterUnprocessedCommits(projectId: string, commitHashes: response[]) {
    const processedCommits = await db.commit.findMany({
        where: {
            projectId: projectId,
        },
    });
    const unprocessedCommits = commitHashes.filter(
        (hash) => !processedCommits.some((commit) => commit.commitHash === hash.commitHash)
    );
    return unprocessedCommits;
}