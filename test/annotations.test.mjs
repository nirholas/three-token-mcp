// MCP ToolAnnotations invariants — pins the safety semantics of the tool
// surface. MCP clients use these hints to decide which calls need a human
// confirmation prompt, so an unannotated tool (or a mis-flagged burn) is a
// safety regression, not a style nit.
//
// Importing src/index.js is side-effect-free: the stdio transport only
// connects when the file is the process entry point, and buildServer()
// requires no signer.
//
// Run: node --test packages/three-token-mcp/test/annotations.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { TOOLS, buildServer } from '../src/index.js';

// The ONLY tool allowed to carry destructiveHint: true — it signs and
// broadcasts an irreversible Solana mainnet burn. Adding an execution tool?
// Add it here deliberately, in the same commit.
const EXECUTION_TOOLS = new Set(['three_burn']);
const READ_ONLY_TOOLS = new Set(['three_price', 'three_balance']);

test('exactly 3 tools are registered', () => {
	assert.equal(TOOLS.length, 3);
	assert.deepEqual(
		new Set(TOOLS.map((t) => t.name)),
		new Set(['three_price', 'three_balance', 'three_burn']),
	);
});

test('every tool has a human title and a complete annotations object', () => {
	for (const tool of TOOLS) {
		assert.equal(typeof tool.title, 'string', `${tool.name} is missing a title`);
		assert.ok(tool.title.length > 0, `${tool.name} has an empty title`);
		assert.ok(tool.annotations, `${tool.name} is missing MCP ToolAnnotations`);
		assert.equal(
			typeof tool.annotations.readOnlyHint,
			'boolean',
			`${tool.name} must set readOnlyHint explicitly`,
		);
		assert.equal(
			typeof tool.annotations.idempotentHint,
			'boolean',
			`${tool.name} must set idempotentHint explicitly`,
		);
		assert.equal(
			typeof tool.annotations.openWorldHint,
			'boolean',
			`${tool.name} must set openWorldHint explicitly`,
		);
	}
});

test('writes always set destructiveHint explicitly (spec default is TRUE when omitted)', () => {
	for (const tool of TOOLS) {
		if (tool.annotations.readOnlyHint === false) {
			assert.equal(
				typeof tool.annotations.destructiveHint,
				'boolean',
				`${tool.name} is a write — destructiveHint must be explicit, never defaulted`,
			);
		}
	}
});

test('the destructive set is EXACTLY three_burn', () => {
	const destructive = TOOLS.filter((t) => t.annotations.destructiveHint === true).map(
		(t) => t.name,
	);
	assert.deepEqual(new Set(destructive), EXECUTION_TOOLS);
});

test('three_price and three_balance are read-only, live-data (non-idempotent), open-world', () => {
	for (const name of READ_ONLY_TOOLS) {
		const tool = TOOLS.find((t) => t.name === name);
		assert.ok(tool, `${name} must exist in the tool registry`);
		assert.equal(tool.annotations.readOnlyHint, true, `${name} should be read-only`);
		assert.equal(tool.annotations.idempotentHint, false, `${name} reads live data`);
		assert.equal(tool.annotations.openWorldHint, true, `${name} talks to external services`);
	}
});

test('three_burn is never marked read-only or idempotent', () => {
	const burn = TOOLS.find((t) => t.name === 'three_burn');
	assert.equal(burn.annotations.readOnlyHint, false);
	assert.equal(burn.annotations.idempotentHint, false);
	assert.equal(burn.annotations.openWorldHint, true);
});

test('buildServer registers every tool with its annotations, without a signer', () => {
	const server = buildServer();
	// McpServer keeps its registry in _registeredTools (name → RegisteredTool).
	const registered = server._registeredTools;
	assert.ok(registered, 'McpServer should expose its tool registry');
	for (const tool of TOOLS) {
		const entry = registered[tool.name];
		assert.ok(entry, `${tool.name} not registered on the server`);
		assert.deepEqual(
			entry.annotations,
			tool.annotations,
			`${tool.name} annotations must survive registration`,
		);
	}
});
