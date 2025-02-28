import { db } from "@/server/db";
import { Octokit } from "octokit";
import pLimit from "p-limit";
import axios from "axios";
import { aiSummariseCommit } from "./aiSummary";

export const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const limit = pLimit(2); // Only 1 request at a time to avoid rate limit

type Response = {
  commitHash: string;
  commitMessage: string;
  commitAuthorName: string;
  commitAuthorAvatar: string;
  commitDate: string;
};

export const getCommitHashes = async (githubUrl: string): Promise<Response[]> => {
  const [owner, repo] = githubUrl.split("/").slice(-2);
  if (!owner || !repo) {
    throw new Error("Invalid GitHub URL");
  }

  const { data } = await octokit.rest.repos.listCommits({ owner, repo });

  const sortedCommits = data.sort(
    (a: any, b: any) =>
      new Date(b.commit.author.date).getTime() - new Date(a.commit.author.date).getTime()
  );

  return sortedCommits.slice(0, 10).map((commit: any) => ({
    commitHash: commit.sha,
    commitMessage: commit.commit.message ?? "",
    commitAuthorName: commit.commit?.author?.name ?? "",
    commitAuthorAvatar: commit?.author?.avatar_url ?? "",
    commitDate: commit.commit?.author.date ?? "",
  }));
};

export const pollCommits = async (projectId: string) => {
  const { project, githubUrl } = await fetchProjectGithubUrl(projectId);
  const commitHashes = await getCommitHashes(githubUrl);
  const unprocessedCommits = await filterUnprocessedCommits(projectId, commitHashes);

  console.log(`🔄 Processing ${unprocessedCommits.length} commits...`);

  const summariesResponses = await Promise.allSettled(
    unprocessedCommits.map((commit) =>
      limit(() => summariseCommitWithRetry(githubUrl, commit.commitHash))
    )
  );

  const summaries = summariesResponses.map((responses, index) => {
    if (responses.status === "fulfilled") {
      return responses.value as string;
    }
    return "";
  });

  await db.commit.createMany({
    data: summaries.map((summary, idx) => ({
      projectId,
      commitHash: unprocessedCommits[idx]!.commitHash,
      summary: summary!,
      commitAuthorName: unprocessedCommits[idx]!.commitAuthorName,
      commitDate: unprocessedCommits[idx]!.commitDate,
      commitMessage: unprocessedCommits[idx]!.commitMessage,
      commitAuthorAvatar: unprocessedCommits[idx]!.commitAuthorAvatar,
    })),
  });

  console.log(`✅ Successfully processed ${summaries.length} commits`);
};

function compressDiff(diff: string) {
  return diff
    .split("\n")
    .filter((line) =>
      line.startsWith("diff --git") || line.startsWith("+") || line.startsWith("-")
    )
    .join("\n")
    .slice(0, 30_000);
}

async function summariseCommit(githubUrl: string, commitHash: string) {
  try {
    const [owner, repo] = githubUrl.split("/").slice(-2);
    if (!owner || !repo) throw new Error("Invalid GitHub URL");

    const { data } = await octokit.rest.repos.getCommit({
      owner,
      repo,
      ref: commitHash,
      headers: {
        Accept: "application/vnd.github.v3.diff",
      },
    });

    const diff = data as unknown as string;
    const compressedDiff = compressDiff(diff);

    if (compressedDiff.length === 0) {
      console.warn(`Commit ${commitHash} has no meaningful changes`);
      return "No meaningful changes to summarize";
    }

    console.log(`Sending compressed diff (${compressedDiff.length} chars)`);

    const summary = await aiSummariseCommit(compressedDiff);
    return summary || "Summary failed";
  } catch (error) {
    console.error(`Error summarizing commit ${commitHash}:`, error);
    throw error; // Let retry handle this
  }
}

async function summariseCommitWithRetry(githubUrl: string, commitHash: string) {
  let retries = 3;
  let delay = 1000; // Start with 1 second

  while (retries > 0) {
    try {
      return await summariseCommit(githubUrl, commitHash);
    } catch (error: any) {
      if (error?.response?.status === 429) {
        console.warn(`Rate limit hit for ${commitHash}... Retrying in ${delay}ms`);
        await new Promise((res) => setTimeout(res, delay));
        retries--;
        delay *= 2; // Exponential backoff
      } else {
        console.error(`Failed to summarize ${commitHash}:`, error);
        return "";
      }
    }
  }

  console.error(`Max retries reached for commit ${commitHash}`);
  return "";
}

async function fetchProjectGithubUrl(projectId: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { githubUrl: true },
  });

  if (!project?.githubUrl) {
    throw new Error("Project does not have a GitHub URL");
  }

  return { project, githubUrl: project.githubUrl };
}

async function filterUnprocessedCommits(projectId: string, commitHashes: Response[]) {
  const processedCommits = await db.commit.findMany({ where: { projectId } });

  return commitHashes.filter(
    (commit) =>
      !processedCommits.some((processedCommit) => processedCommit.commitHash === commit.commitHash)
  );
}
