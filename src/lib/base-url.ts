/**
 * Detects the base URL from deployment environment variables with fallback to default.
 * Supports Netlify, Vercel, GitHub Pages, and other platforms.
 */
export function getBaseUrl(): string {
	if (typeof window !== 'undefined') {
		// Client-side: use window.location.origin
		return window.location.origin;
	}

	// Server-side: detect from environment variables

	// Netlify detection
	if (import.meta.env.NETLIFY === 'true' || import.meta.env.CONTEXT) {
		const url = import.meta.env.URL || import.meta.env.DEPLOY_URL;
		if (url) {
			return url.replace(/\/$/, '');
		}
	}

	// Vercel detection
	if (import.meta.env.VERCEL === '1' || import.meta.env.VERCEL_ENV) {
		const url = import.meta.env.VERCEL_URL;
		if (url) {
			// VERCEL_URL doesn't include protocol
			return url.startsWith('http') ? url.replace(/\/$/, '') : `https://${url}`;
		}
	}

	// GitHub Pages detection (via custom env var if set)
	if (import.meta.env.GITHUB_PAGES === 'true') {
		const url = import.meta.env.PAGES_URL;
		if (url) {
			return url.replace(/\/$/, '');
		}
	}

	// Fallback to default
	return 'https://timetable.usltd.ge';
}
