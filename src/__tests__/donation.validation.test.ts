import test from 'node:test';
import assert from 'node:assert/strict';

import {
    createDonationSchema,
    listDonationsQuerySchema,
    donationParamsSchema,
} from '../components/v1/Donation/donation.validation';

const validAddress = '0x1234567890abcdef1234567890abcdef12345678';
const validTokenAddress = '0xabcdef1234567890abcdef1234567890abcdef12';

test('createDonationSchema validates required fields', () => {
    assert.throws(() => createDonationSchema.parse({}), /Required/);
});

test('createDonationSchema rejects invalid Ethereum addresses', () => {
    assert.throws(
        () =>
            createDonationSchema.parse({
                campaignId: 'camp_1',
                donorAddress: 'invalid',
                tokenAddress: validTokenAddress,
                tokenSymbol: 'USDC',
                tokenDecimals: 6,
                amount: '100',
            }),
        /donorAddress/
    );

    assert.throws(
        () =>
            createDonationSchema.parse({
                campaignId: 'camp_1',
                donorAddress: validAddress,
                tokenAddress: 'invalid',
                tokenSymbol: 'USDC',
                tokenDecimals: 6,
                amount: '100',
            }),
        /tokenAddress/
    );
});

test('createDonationSchema rejects invalid decimal strings', () => {
    assert.throws(
        () =>
            createDonationSchema.parse({
                campaignId: 'camp_1',
                donorAddress: validAddress,
                tokenAddress: validTokenAddress,
                tokenSymbol: 'USDC',
                tokenDecimals: 6,
                amount: 'abc',
            }),
        /amount/
    );
});

test('createDonationSchema rejects invalid token decimals', () => {
    assert.throws(
        () =>
            createDonationSchema.parse({
                campaignId: 'camp_1',
                donorAddress: validAddress,
                tokenAddress: validTokenAddress,
                tokenSymbol: 'USDC',
                tokenDecimals: -1,
                amount: '100',
            }),
        /tokenDecimals/
    );

    assert.throws(
        () =>
            createDonationSchema.parse({
                campaignId: 'camp_1',
                donorAddress: validAddress,
                tokenAddress: validTokenAddress,
                tokenSymbol: 'USDC',
                tokenDecimals: 31,
                amount: '100',
            }),
        /tokenDecimals/
    );
});

test('createDonationSchema accepts valid input with optional fields', () => {
    const result = createDonationSchema.parse({
        campaignId: 'camp_1',
        campaignRef: 'REF123',
        donorId: 'user_1',
        donorAddress: validAddress,
        donorName: 'John Doe',
        tokenAddress: validTokenAddress,
        tokenSymbol: 'USDC',
        tokenDecimals: 6,
        amount: '100.50',
        usdAmount: '100.50',
        gasFee: '0.001',
        transactionHash:
            '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        network: 'mainnet',
        isAnonymous: false,
        message: 'Great campaign!',
        campaignTitle: 'Help the kids',
    });

    assert.equal(result.campaignId, 'camp_1');
    assert.equal(result.donorAddress, validAddress);
    assert.equal(result.amount, '100.50');
    assert.equal(result.isAnonymous, false);
    assert.equal(result.message, 'Great campaign!');
    assert.equal(result.campaignTitle, 'Help the kids');
});

test('createDonationSchema accepts minimal valid input', () => {
    const result = createDonationSchema.parse({
        campaignId: 'camp_1',
        donorAddress: validAddress,
        tokenAddress: validTokenAddress,
        tokenSymbol: 'USDC',
        tokenDecimals: 6,
        amount: '50',
    });

    assert.equal(result.campaignId, 'camp_1');
    assert.equal(result.amount, '50');
});

test('listDonationsQuerySchema provides defaults for page and limit', () => {
    const result = listDonationsQuerySchema.parse({});

    assert.equal(result.page, 1);
    assert.equal(result.limit, 20);
    assert.equal(result.sort_by, 'created_at');
    assert.equal(result.sort_order, 'desc');
});

test('listDonationsQuerySchema clamps limit to max 100', () => {
    const result = listDonationsQuerySchema.parse({
        limit: '999',
    });

    assert.equal(result.limit, 100);
});

test('listDonationsQuerySchema converts string page/limit to numbers', () => {
    const result = listDonationsQuerySchema.parse({
        page: '3',
        limit: '10',
    });

    assert.equal(result.page, 3);
    assert.equal(result.limit, 10);
});

test('listDonationsQuerySchema accepts all filter fields', () => {
    const result = listDonationsQuerySchema.parse({
        page: '1',
        limit: '20',
        sort_by: 'amount',
        sort_order: 'asc',
        from_date: '2024-01-01T00:00:00.000Z',
        to_date: '2024-12-31T23:59:59.000Z',
        min_amount: '10',
        max_amount: '1000',
        campaign_id: 'camp_1',
        donor_id: 'user_1',
        donation_token: validTokenAddress,
        status: 'confirmed',
        confirmed: 'true',
        search: 'john',
    });

    assert.equal(result.sort_by, 'amount');
    assert.equal(result.sort_order, 'asc');
    assert.equal(result.status, 'confirmed');
    assert.equal(result.confirmed, true);
    assert.equal(result.search, 'john');
});

test('listDonationsQuerySchema parses sort_by campaign_ref, campaign_title and donor_address', () => {
    const byCampaign = listDonationsQuerySchema.parse({
        sort_by: 'campaign_ref',
    });
    assert.equal(byCampaign.sort_by, 'campaign_ref');

    const byTitle = listDonationsQuerySchema.parse({
        sort_by: 'campaign_title',
    });
    assert.equal(byTitle.sort_by, 'campaign_title');

    const byDonor = listDonationsQuerySchema.parse({
        sort_by: 'donor_address',
    });
    assert.equal(byDonor.sort_by, 'donor_address');
});

test('listDonationsQuerySchema parses confirmed param', () => {
    const confirmed = listDonationsQuerySchema.parse({ confirmed: 'true' });
    assert.equal(confirmed.confirmed, true);

    const notConfirmed = listDonationsQuerySchema.parse({ confirmed: 'false' });
    assert.equal(notConfirmed.confirmed, false);

    const unset = listDonationsQuerySchema.parse({});
    assert.equal(unset.confirmed, undefined);
});

test('donationParamsSchema validates UUID format', () => {
    assert.throws(
        () => donationParamsSchema.parse({ id: 'not-a-uuid' }),
        /uuid/
    );
    assert.doesNotThrow(() =>
        donationParamsSchema.parse({
            id: '550e8400-e29b-41d4-a716-446655440000',
        })
    );
});
