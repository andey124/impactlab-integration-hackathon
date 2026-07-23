import { PUBLIC_API_BASE_URL } from '$env/static/public';
import type { NextStep, PathNode } from '$lib/types';

async function request<T>(
	path: string,
	init?: RequestInit,
	fetchImpl: typeof fetch = fetch
): Promise<T> {
	const response = await fetchImpl(`${PUBLIC_API_BASE_URL}${path}`, {
		...init,
		headers: { 'Content-Type': 'application/json', ...init?.headers }
	});
	if (!response.ok) {
		throw new Error(`Request to ${path} failed with status ${response.status}`);
	}
	return response.json() as Promise<T>;
}

export function fetchPath(fetchImpl: typeof fetch = fetch): Promise<{ nodes: PathNode[] }> {
	return request('/api/path', undefined, fetchImpl);
}

export function analyzeDocument(
	images: string[],
	targetLang: string
): Promise<{ translation: string; nextSteps: NextStep[] }> {
	return request('/api/analyze-document', {
		method: 'POST',
		body: JSON.stringify({ images, targetLang })
	});
}

export function createNode(
	title: string,
	translation: string,
	nextSteps: NextStep[]
): Promise<{ node: PathNode }> {
	return request('/api/path/nodes', {
		method: 'POST',
		body: JSON.stringify({ title, translation, nextSteps })
	});
}

export function markNodeDone(id: string): Promise<{ node: PathNode }> {
	return request(`/api/path/nodes/${id}`, {
		method: 'PATCH',
		body: JSON.stringify({ status: 'done' })
	});
}
