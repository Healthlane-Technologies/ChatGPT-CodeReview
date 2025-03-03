import { OpenAI, AzureOpenAI } from 'openai';
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { FileReviewPrompt, GetPrSummaryPrompt, GetCommitReviewSummaryPrompt } from './prompts/main';
import { ZANGO, ZANGO_MANIFEST, ZANGO_SETTINGS } from './prompts/zango/zango';
import { ZANGO_WORKFLOW } from './prompts/zango/workflow';
import { ZANGO_CRUD_FORM, ZANGO_CRUD_VIEW, ZANGO_CRUD_TABLE, ZANGO_CRUD_DETAIL } from './prompts/zango/crud';
import { ZANGO_APP_STRUCTURE } from './prompts/zango/structure';
import { ZELTHY1_CONTEXT, ZELTHY1_REVIEW_GUIDELINES } from './prompts/zelthy/prompt';
import { ZELTHY1_APP_STRUCTURE } from './prompts/zelthy/structure';
import { ProbotOctokit } from 'probot';
import { basename } from 'path';

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

  private async getFileReviewSystemPrompt(repoOwner: string, repo: string, branch: string, filename: string): Promise<string> {
    const manifest = await this.getFileFromRepo("manifest.json", repoOwner, repo, branch)
    const manifestJson = JSON.parse(manifest);
    if ("zango_version" in manifestJson) {
      const filName = basename(filename)
      switch (filName) {
        case "details.py":
          return `
            ${ZANGO}
            ${FileReviewPrompt}
            ${ZANGO_APP_STRUCTURE}
            ${ZANGO_CRUD_DETAIL}
          `;
        case "forms.py":
          return `
            ${ZANGO}
            ${FileReviewPrompt}
            ${ZANGO_APP_STRUCTURE}
            ${ZANGO_CRUD_FORM}
          `;
        case "models.py":
          return `
            ${ZANGO}
            ${FileReviewPrompt}
            ${ZANGO_APP_STRUCTURE}
          `;
        case "policies.json":
          return `
            ${ZANGO}
            ${FileReviewPrompt}
          `;
        case "tables.py":
          return `
            ${ZANGO}
            ${FileReviewPrompt}
            ${ZANGO_APP_STRUCTURE}
            ${ZANGO_CRUD_TABLE}
          `;
        case "views.py":
          return `
            ${ZANGO}
            ${FileReviewPrompt}
            ${ZANGO_APP_STRUCTURE}
            ${ZANGO_CRUD_VIEW}
          `;
        case "workflow.py":
          return `
            ${ZANGO}
            ${FileReviewPrompt}
            ${ZANGO_WORKFLOW}
          `;
        case "manifest.json":
          return `
            ${ZANGO}
            ${FileReviewPrompt}
            ${ZANGO_MANIFEST}
          `;
        case "settings.json":
          return `
            ${ZANGO}
            ${FileReviewPrompt}
            ${ZANGO_SETTINGS}
          `;
        default:
          return `${ZANGO} ${FileReviewPrompt}`;
      }
    } else if ("app_versions" in manifestJson) {
      return `
        ${ZELTHY1_CONTEXT}
        ${FileReviewPrompt}
        ${ZELTHY1_APP_STRUCTURE}
        ${ZELTHY1_REVIEW_GUIDELINES}
      `;
    }
    return "Warn the user that the repository on which this review workflow is enabled might not be a zelthy or zango app";
  }

  public async fileReview(patch: string, filename: string, repoOwner: string, repo: string, branch: string): Promise<{ reviews: FileReviewsType | null, fileContent: string }>  {
    if (!patch || !filename) {
      throw new Error('Patch and filename are required');
    }

    console.time('code-review-time');
    try {
      const fileContent = await this.getFileFromRepo(filename, repoOwner, repo, branch);
      const fileRevUserPrompt = await this.generateFileReviewUserPrompt(patch, filename, fileContent);
      const fileRevSysPrompt = await this.getFileReviewSystemPrompt(repoOwner, repo, branch, filename);
      const res = await this.openai.beta.chat.completions.parse({
        messages: [
          {
            role: 'system',
            content: fileRevSysPrompt,
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
