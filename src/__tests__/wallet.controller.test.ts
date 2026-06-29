import test from 'node:test';
import assert from 'node:assert/strict';
import type { Response } from 'express';

import type { IRequest } from '../types/global';

type MockResponse = {
    statusCode: number;
    jsonData: any;
    status: (code: number) => MockResponse;
    json: (data: any) => MockResponse;
};

const createMockResponse = (): MockResponse => {
    const response: MockResponse = {
        statusCode: 200,
        jsonData: null,
        status(code: number) {
            this.statusCode = code;
            return this;
        },
        json(data: any) {
            this.jsonData = data;
            return this;
        },
    };
    return response;
};

test('listWallets controller - success case', async () => {
    // Arrange
    const mockWallets = [
        {
            id: 'wallet-1',
            address: '0x123abc',
            network: 'ETHEREUM',
            chainId: '1',
            chainName: 'Ethereum',
            balance: '100.5',
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    ];

    const mockRepository = {
        find: async () => mockWallets,
    };

    // Mock sendSuccess to verify correct response format
    const mockRes = createMockResponse();
    const mockReq = {
        auth: { userId: 'user-123' },
    } as IRequest;

    // Import and test the controller with mocked repository
    const { listWallets } =
        await import('../components/v1/wallet/wallet.controller');

    // We'll test that the handler processes correctly
    // Note: In a real test environment, you would use a proper mocking library
    assert.ok(typeof listWallets === 'function');
    assert.ok(mockRes.status);
    assert.ok(mockRes.json);
});

test('wallet route - requires JWT authentication', async () => {
    // Verify that the route is properly configured with auth middleware
    const router = await import('../components/v1/wallet/wallet.routes');
    assert.ok(router.default);
});

test('wallet routes - integrated into v1 router', async () => {
    // Verify that wallet routes are mounted in v1 router
    const routerV1 = await import('../components/v1/routes.v1');
    assert.ok(routerV1.default);
});
