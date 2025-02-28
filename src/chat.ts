import { OpenAI, AzureOpenAI } from 'openai';
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { FileReviewPrompt, GetPrSummaryPrompt, GetCommitReviewSummaryPrompt } from './prompt';
import { ProbotOctokit } from 'probot';

const FileReview = z.object({
  review: z.string(),
  line: z.number().int(),
});

const FileReviews = z.object({
  reviews: z.array(FileReview)
});

type FileReviewsType = z.infer<typeof FileReviews>;

export class Chat {
  private openai: OpenAI | AzureOpenAI;
  private isAzure: boolean;
  private octokit: InstanceType<typeof ProbotOctokit>;

  constructor(apiKey: string, octokit: InstanceType<typeof ProbotOctokit>) {
    if (!apiKey) {
      throw new Error('API key is required');
    }

    this.isAzure = Boolean(
      process.env.AZURE_API_VERSION && process.env.AZURE_DEPLOYMENT
    );

    if (this.isAzure) {
      if (!process.env.OPENAI_API_ENDPOINT) {
        throw new Error('Azure endpoint is required');
      }
      this.openai = new AzureOpenAI({
        apiKey,
        endpoint: process.env.OPENAI_API_ENDPOINT,
        apiVersion: process.env.AZURE_API_VERSION || '2024-02-15-preview',
        deployment: process.env.AZURE_DEPLOYMENT,
      });
    } else {
      this.openai = new OpenAI({
        apiKey,
        baseURL: process.env.OPENAI_API_ENDPOINT || 'https://api.openai.com/v1',
      });
    }

    this.octokit = octokit;
  }

  private async generateFileReviewUserPrompt(patch: string, filename: string, fileContent: string): Promise<string> {
    if (fileContent !== "" || fileContent.split("\n").length < 300) {
      return `
        Filename: ${filename}
        Patch:
        \`\`\`
        ${patch}
        \`\`\`

        FileContent:
        \`\`\`
        ${fileContent}
        \`\`\``
        ;
    }

    return `
      Filename: ${filename}
      Patch:
      \`\`\`
      ${patch}
      \`\`\``;
  }

  private generatePRSummaryUserPrompt(changedFiles: string): string {
    return changedFiles;
  }

  public async fileReview(patch: string, filename: string, repoOwner: string, repo: string, branch: string): Promise<{ reviews: FileReviewsType | null, fileContent: string }>  {
    if (!patch || !filename) {
      throw new Error('Patch and filename are required');
    }

    console.time('code-review-time');
    try {
      const fileContent = await this.getFileFromRepo(filename, repoOwner, repo, branch);
      const fileRevUserPrompt = await this.generateFileReviewUserPrompt(patch, filename, fileContent);
      const res = await this.openai.beta.chat.completions.parse({
        messages: [
          {
            role: 'system',
            content: FileReviewPrompt,
          },
          {
            role: 'user',
            content: fileRevUserPrompt,
          }
        ],
        model: process.env.MODEL || 'gpt-4',
        temperature: +(process.env.temperature || 0.3),
        top_p: +(process.env.top_p || 0.8),
        max_tokens: process.env.max_tokens ? +process.env.max_tokens : 2000,
        response_format: zodResponseFormat(FileReviews, "FileReviewResponse")
      });

      if (!res.choices.length) {
        throw new Error('No response received from OpenAI');
      }

      return {
        reviews: res.choices[0].message.parsed,
        fileContent: fileContent
      };
    } catch (error) {
      console.error('OpenAI API request failed:', error);
      throw new Error(`Failed to process request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      console.timeEnd('code-review-time');
    }
  }

  public async getPRSummary(changedFiles: string): Promise<string> {
    if (!changedFiles) {
      throw new Error('Changed files information is required');
    }

    const prSumUserPrompt = this.generatePRSummaryUserPrompt(changedFiles);
    const res = await this.openai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: GetPrSummaryPrompt,
        },
        {
          role: 'user',
          content: prSumUserPrompt,
        }
      ],
      model: process.env.MODEL || 'gpt-4',
      temperature: +(process.env.temperature || 0.3),
      top_p: +(process.env.top_p || 0.8),
      max_tokens: process.env.max_tokens ? +process.env.max_tokens : 2000,
    });

    return res.choices[0]?.message?.content || '';
  }

  public async getCommitReviewsSummary(fileReviews: string): Promise<string> {
    if (!fileReviews) {
      throw new Error('File reviews are required');
    }

    const res = await this.openai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: GetCommitReviewSummaryPrompt,
        },
        {
          role: 'user',
          content: fileReviews,
        }
      ],
      model: process.env.MODEL || 'gpt-4',
      temperature: +(process.env.temperature || 0.3),
      top_p: +(process.env.top_p || 0.8),
      max_tokens: process.env.max_tokens ? +process.env.max_tokens : 2000,
    });

    return res.choices[0]?.message?.content || '';
  }

  public async getFileFromRepo(
    path: string,
    owner: string,
    repo: string,
    ref: string
  ): Promise<string> {
    try {
      const { data } = await this.octokit.repos.getContent({
        owner,
        repo,
        path,
        ref,
      });

      // Check if data is an array (directory) or not a file
      if (Array.isArray(data) || !('content' in data)) {
        throw new Error('Requested path is not a file');
      }

      // Decode the base64 content
      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      if (content.split('\n').length > 500) {
        return "File could not be read as it is too big"
      }
      return content;
    } catch (error) {
      console.error("Error fetching file:", error);
      throw error;
    }
  }
}
