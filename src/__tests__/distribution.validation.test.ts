import test from 'node:test';
import assert from 'node:assert/strict';

import {
    createDistributionSchema,
    updateDistributionSchema,
    updateDistributionParamsSchema,
} from '../components/v1/distribution/distribution.validation';
import { DistributionType, DistributionStatus, Network } from '../types/enums';

const validAddress = '0x1234567890abcdef1234567890abcdef12345678';
const validTokenAddress = '0xabcdef1234567890abcdef1234567890abcdef12';

const baseCreate = {
    userAddress: validAddress,
    tokenAddress: validTokenAddress,
    tokenSymbol: 'USDC',
    tokenDecimals: 6,
    totalAmount: '1000',
    feeAmount: '10',
    totalRecipients: 5,
    distributionType: DistributionType.AIRDROP,
};

test('createDistributionSchema accepts a valid payload', () => {
    const result = createDistributionSchema.parse(baseCreate);
    assert.equal(result.userAddress, validAddress);
    assert.equal(result.distributionType, DistributionType.AIRDROP);
});

test('createDistributionSchema accepts optional fields', () => {
    const result = createDistributionSchema.parse({
        ...baseCreate,
        usdRate: '1.5',
        chainName: 'ethereum',
        network: Network.TESTNET,
        metadata: { note: 'q3 rewards' },
    });
    assert.equal(result.usdRate, '1.5');
    assert.equal(result.network, Network.TESTNET);
    assert.deepEqual(result.metadata, { note: 'q3 rewards' });
});

test('createDistributionSchema rejects invalid Ethereum addresses', () => {
    assert.throws(
        () => createDistributionSchema.parse({ ...baseCreate, userAddress: 'invalid' }),
        /userAddress/
    );
    assert.throws(
        () => createDistributionSchema.parse({ ...baseCreate, tokenAddress: 'invalid' }),
        /tokenAddress/
    );
});

test('createDistributionSchema rejects invalid decimal strings', () => {
    assert.throws(
        () => createDistributionSchema.parse({ ...baseCreate, totalAmount: 'abc' }),
        /totalAmount/
    );
    assert.throws(
        () => createDistributionSchema.parse({ ...baseCreate, feeAmount: 'xyz' }),
        /feeAmount/
    );
});

test('createDistributionSchema rejects out-of-range tokenDecimals', () => {
    assert.throws(
        () => createDistributionSchema.parse({ ...baseCreate, tokenDecimals: -1 }),
        /tokenDecimals/
    );
    assert.throws(
        () => createDistributionSchema.parse({ ...baseCreate, tokenDecimals: 31 }),
        /tokenDecimals/
    );
});

test('createDistributionSchema rejects non-positive totalRecipients', () => {
    assert.throws(
        () => createDistributionSchema.parse({ ...baseCreate, totalRecipients: 0 }),
        /totalRecipients/
    );
});

test('createDistributionSchema rejects an invalid distributionType', () => {
    assert.throws(
        () =>
            createDistributionSchema.parse({
                ...baseCreate,
                distributionType: 'not_a_type',
            }),
        /distributionType/
    );
});

test('updateDistributionSchema accepts a partial payload with status', () => {
    const result = updateDistributionSchema.parse({
        status: DistributionStatus.COMPLETED,
    });
    assert.equal(result.status, DistributionStatus.COMPLETED);
});

test('updateDistributionSchema rejects an invalid status', () => {
    assert.throws(
        () => updateDistributionSchema.parse({ status: 'bogus' }),
        /status/
    );
});

test('updateDistributionParamsSchema validates UUID format', () => {
    assert.throws(
        () => updateDistributionParamsSchema.parse({ id: 'not-a-uuid' }),
        /uuid/
    );
    assert.doesNotThrow(() =>
        updateDistributionParamsSchema.parse({
            id: '550e8400-e29b-41d4-a716-446655440000',
        })
    );
});
