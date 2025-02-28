import { z } from "zod";
import { ProbotOctokit } from 'probot';
declare const FileReviews: z.ZodObject<{
    reviews: z.ZodArray<z.ZodObject<{
        review: z.ZodString;
        line: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        review: string;
        line: number;
    }, {
        review: string;
        line: number;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    reviews: {
        review: string;
        line: number;
    }[];
}, {
    reviews: {
        review: string;
        line: number;
    }[];
}>;
type FileReviewsType = z.infer<typeof FileReviews>;
export declare class Chat {
    private openai;
    private isAzure;
    private octokit;
    constructor(apiKey: string, octokit: InstanceType<typeof ProbotOctokit>);
    private generateFileReviewUserPrompt;
    private generatePRSummaryUserPrompt;
    fileReview(patch: string, filename: string, repoOwner: string, repo: string, branch: string): Promise<{
        reviews: FileReviewsType | null;
        fileContent: string;
    }>;
    getPRSummary(changedFiles: string): Promise<string>;
    getCommitReviewsSummary(fileReviews: string): Promise<string>;
    getFileFromRepo(path: string, owner: string, repo: string, ref: string): Promise<string>;
}
export {};
