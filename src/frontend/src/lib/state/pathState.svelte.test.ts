import { describe, it, expect, beforeEach } from 'vitest';
import { pathState } from './pathState.svelte';
import type { PathNode } from '$lib/types';

function makeNode(overrides: Partial<PathNode> = {}): PathNode {
	return {
		id: '1',
		title: 'Letter 1',
		status: 'active',
		translation: 'Please confirm your registration.',
		nextSteps: [{ text: 'Bring your passport to the Bürgeramt.' }],
		createdAt: '2026-07-23T10:00:00.000Z',
		...overrides
	};
}

describe('pathState', () => {
	beforeEach(() => {
		pathState.setNodes([]);
	});

	it('has no active node when empty', () => {
		expect(pathState.hasActiveNode).toBe(false);
	});

	it('addNode appends the node and marks hasActiveNode true', () => {
		pathState.addNode(makeNode());
		expect(pathState.nodes).toHaveLength(1);
		expect(pathState.hasActiveNode).toBe(true);
	});

	it('markDone flips the matching node to done and clears hasActiveNode', () => {
		pathState.addNode(makeNode({ id: '1' }));
		pathState.markDone('1');
		expect(pathState.nodes[0].status).toBe('done');
		expect(pathState.hasActiveNode).toBe(false);
	});

	it('markDone does not affect other nodes', () => {
		pathState.addNode(makeNode({ id: '1', status: 'done' }));
		pathState.addNode(makeNode({ id: '2' }));
		pathState.markDone('2');
		expect(pathState.nodes[0].status).toBe('done');
		expect(pathState.nodes[1].status).toBe('done');
	});

	it('addNode records the new node id as justAddedId', () => {
		pathState.addNode(makeNode({ id: '1' }));
		expect(pathState.justAddedId).toBe('1');
	});
});
