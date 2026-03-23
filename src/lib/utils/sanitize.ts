/**
 * Basic HTML sanitizer for CMS content.
 * Strips script tags and event handlers to prevent XSS.
 * For full security, consider using DOMPurify.
 */
export function sanitizeHtml(html: string | null | undefined): string {
	if (!html) return '';
	return html
		// Remove script tags and their content
		.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
		// Remove event handler attributes (onclick, onerror, onload, etc.)
		.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
		// Remove javascript: protocol in hrefs
		.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"');
}
