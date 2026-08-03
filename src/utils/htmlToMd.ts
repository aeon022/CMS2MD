import TurndownService from 'turndown';
import * as yaml from 'js-yaml';
import { CMSItem } from '../types';

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
});

export function convertToMarkdown(item: CMSItem, contentField: string = 'content'): { frontmatterYaml: string; bodyMarkdown: string; fullContent: string } {
  // Extract body field
  const rawBody = item[contentField] || item.content || item.body || item.text || '';
  let bodyMarkdown = typeof rawBody === 'string' && rawBody.includes('<') ? turndownService.turndown(rawBody) : String(rawBody || '');

  // Extract metadata for frontmatter (exclude raw body from frontmatter)
  const metadata: Record<string, any> = {};
  for (const [key, value] of Object.entries(item)) {
    if (key !== contentField && key !== 'content' && key !== 'body' && key !== 'text') {
      metadata[key] = value;
    }
  }

  const frontmatterYaml = yaml.dump(metadata, { lineWidth: -1 }).trim();
  const fullContent = `---\n${frontmatterYaml}\n---\n\n${bodyMarkdown.trim()}\n`;

  return {
    frontmatterYaml,
    bodyMarkdown: bodyMarkdown.trim(),
    fullContent
  };
}
