import { z } from "zod";
import { ProbotOctokit } from 'probot';
declare const FileReviewResponse: z.ZodObject<{
    review: z.ZodString;
    position: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    review: string;
    position: number;
}, {
    review: string;
    position: number;
}>;
type FileReviewType = z.infer<typeof FileReviewResponse>;
export declare class Chat {
    private openai;
    private isAzure;
    private octokit;
    constructor(apiKey: string, octokit: InstanceType<typeof ProbotOctokit>);
    private generateFileReviewUserPrompt;
    private generatePRSummaryUserPrompt;
    fileReview(patch: string, filename: string, repoOwner: string, repo: string, branch: string): Promise<FileReviewType | null>;
    getPRSummary(changedFiles: string): Promise<string>;
    getCommitReviewsSummary(fileReviews: string): Promise<string>;
    getFileFromRepo(path: string, owner: string, repo: string, ref: string): Promise<string>;
}
export {};
