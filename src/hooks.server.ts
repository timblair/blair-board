import type { Handle } from '@sveltejs/kit';

const ORIGIN_SECRET = process.env.ORIGIN_SECRET;

export const handle: Handle = async ({ event, resolve }) => {
	if (ORIGIN_SECRET && event.request.headers.get('x-origin-secret') !== ORIGIN_SECRET) {
		return new Response('Forbidden', { status: 403 });
	}
	return resolve(event);
};
