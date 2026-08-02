// sanitize-html is a CommonJS callable; Nest's output cannot use a synthetic default.
// eslint-disable-next-line @typescript-eslint/no-require-imports
import sanitizeHtml = require('sanitize-html');
import { DomainError } from '../../../common/errors/domain-error';

const tiptapTags = [
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  's',
  'strike',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'blockquote',
  'pre',
  'code',
  'hr',
  'a',
];

/** Enforces the server-side HTML policy before a revision enters immutable history. */
export function sanitizePortalContentBody(value: string): string {
  const sanitized = sanitizeHtml(value, {
    allowedTags: tiptapTags,
    allowedAttributes: { a: ['href', 'title', 'target', 'rel'] },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowProtocolRelative: false,
    disallowedTagsMode: 'discard',
    transformTags: {
      a: (_tagName, attributes) => ({
        tagName: 'a',
        attribs: { ...attributes, rel: 'noopener noreferrer' },
      }),
    },
  }).trim();
  const text = sanitizeHtml(sanitized, { allowedTags: [], allowedAttributes: {} })
    .replaceAll('&nbsp;', ' ')
    .trim();
  if (!text) {
    throw new DomainError('PORTAL_CONTENT_BODY_REQUIRED', '正文不能为空');
  }
  return sanitized;
}
