// H1 invariant: the burn engine must refuse any mint that is not canonical
// $THREE, and must refuse a burn_address that is not the expected incinerator.
// These guards never touch the network — they validate the (untrusted) HTTP
// config object before a transaction is ever built.
//
// Run: node --test packages/three-token-mcp/test/mint-guard.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { assertCanonicalThree } from '../src/lib/token.js';
import { THREE_MINT, EXPECTED_BURN_ADDRESS } from '../src/config.js';

const CANONICAL = 'FeMbDoX7R1Psc4GEcvJdsbNbZA3bfztcyDCatJVJpump';

test('THREE_MINT is the canonical $THREE CA', () => {
	assert.equal(THREE_MINT, CANONICAL);
});

test('accepts a config that matches canonical $THREE + incinerator', () => {
	assert.doesNotThrow(() =>
		assertCanonicalThree({ mint: THREE_MINT, burn_address: EXPECTED_BURN_ADDRESS }),
	);
});

test('refuses a non-$THREE mint', () => {
	assert.throws(
		() => assertCanonicalThree({ mint: 'So11111111111111111111111111111111111111112', burn_address: EXPECTED_BURN_ADDRESS }),
		(err) => err.code === 'mint_mismatch' && /canonical \$THREE/.test(err.message),
	);
});

test('refuses a missing mint', () => {
	assert.throws(
		() => assertCanonicalThree({ burn_address: EXPECTED_BURN_ADDRESS }),
		(err) => err.code === 'mint_mismatch',
	);
});

test('refuses a tampered burn_address even when the mint is correct', () => {
	assert.throws(
		() => assertCanonicalThree({ mint: THREE_MINT, burn_address: 'AttackerAddr1111111111111111111111111111111' }),
		(err) => err.code === 'burn_address_mismatch',
	);
});

test('refuses a missing burn_address', () => {
	assert.throws(
		() => assertCanonicalThree({ mint: THREE_MINT }),
		(err) => err.code === 'burn_address_mismatch',
	);
});
