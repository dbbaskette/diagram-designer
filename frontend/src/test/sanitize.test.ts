import { describe, it, expect } from 'vitest';
import { sanitizeHtml, renderMarkdown } from '../utils/sanitize';

describe('sanitizeHtml', () => {
  it('allows safe HTML tags', () => {
    const input = '<p>Hello <strong>world</strong></p>';
    expect(sanitizeHtml(input)).toBe('<p>Hello <strong>world</strong></p>');
  });

  it('allows links with safe attributes', () => {
    const input = '<a href="https://example.com" target="_blank">Link</a>';
    const result = sanitizeHtml(input);
    expect(result).toContain('href="https://example.com"');
    expect(result).toContain('target="_blank"');
  });

  it('allows class attributes', () => {
    const input = '<div class="my-class"><span class="text-blue-500">text</span></div>';
    expect(sanitizeHtml(input)).toContain('class="my-class"');
    expect(sanitizeHtml(input)).toContain('class="text-blue-500"');
  });

  it('strips script tags', () => {
    const input = '<p>Safe</p><script>alert("xss")</script>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('<script');
    expect(result).not.toContain('alert');
    expect(result).toContain('<p>Safe</p>');
  });

  it('strips event handler attributes', () => {
    const input = '<img src="x" onerror="alert(1)">';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('onerror');
    expect(result).not.toContain('alert');
  });

  it('strips onclick attributes', () => {
    const input = '<div onclick="alert(1)">click me</div>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('onclick');
  });

  it('strips iframe tags', () => {
    const input = '<iframe src="https://evil.com"></iframe>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('<iframe');
  });

  it('strips form elements', () => {
    const input = '<form action="/steal"><input type="text"><button>Submit</button></form>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('<form');
    expect(result).not.toContain('<input');
    expect(result).not.toContain('<button');
  });

  it('strips style tags', () => {
    const input = '<style>body { display: none }</style><p>text</p>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('<style');
    expect(result).toContain('<p>text</p>');
  });

  it('strips javascript: URIs', () => {
    const input = '<a href="javascript:alert(1)">click</a>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('javascript:');
  });

  it('strips data attributes', () => {
    const input = '<div data-evil="payload">content</div>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('data-evil');
  });

  it('handles empty string', () => {
    expect(sanitizeHtml('')).toBe('');
  });

  it('allows table elements', () => {
    const input = '<table><thead><tr><th>Header</th></tr></thead><tbody><tr><td>Cell</td></tr></tbody></table>';
    const result = sanitizeHtml(input);
    expect(result).toContain('<table>');
    expect(result).toContain('<th>Header</th>');
    expect(result).toContain('<td>Cell</td>');
  });
});

describe('renderMarkdown', () => {
  it('renders headings', () => {
    const result = renderMarkdown('# Hello World');
    expect(result).toContain('<h1>');
    expect(result).toContain('Hello World');
  });

  it('renders bold and italic', () => {
    const result = renderMarkdown('**bold** and *italic*');
    expect(result).toContain('<strong>bold</strong>');
    expect(result).toContain('<em>italic</em>');
  });

  it('renders links', () => {
    const result = renderMarkdown('[Example](https://example.com)');
    expect(result).toContain('href="https://example.com"');
    expect(result).toContain('Example');
  });

  it('renders code blocks', () => {
    const result = renderMarkdown('```\nconst x = 1;\n```');
    expect(result).toContain('<code>');
    expect(result).toContain('const x = 1;');
  });

  it('renders unordered lists', () => {
    const result = renderMarkdown('- item 1\n- item 2');
    expect(result).toContain('<li>');
    expect(result).toContain('item 1');
    expect(result).toContain('item 2');
  });

  it('sanitizes XSS in markdown', () => {
    const result = renderMarkdown('# Title\n\n<script>alert("xss")</script>\n\nSafe text');
    expect(result).not.toContain('<script');
    expect(result).toContain('Safe text');
    expect(result).toContain('<h1>');
  });

  it('sanitizes event handlers injected via markdown HTML', () => {
    const result = renderMarkdown('<img src="x" onerror="alert(1)">');
    expect(result).not.toContain('onerror');
  });

  it('handles empty string', () => {
    expect(renderMarkdown('')).toBe('');
  });
});
