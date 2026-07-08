import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { AddressInfo } from 'node:net';
import type { Response } from 'express';

import { requireAdminApi } from '../appMiddlewares/jwtAuth.api';
import { listWallets } from '../components/v1/wallet/wallet.controller';
import walletRoutes from '../components/v1/wallet/wallet.routes';
import walletRepository from '../components/v1/wallet/wallet.services';
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

test('listWallets returns wallet data when the repository succeeds', async () => {
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

    const res = createMockResponse();
    const req = { auth: { userId: 'user-123' } } as IRequest;
    const originalFind = walletRepository.find.bind(walletRepository);

    try {
        (
            walletRepository as unknown as {
                find: typeof walletRepository.find;
            }
        ).find = async () => mockWallets as any;

        await listWallets(req, res as unknown as Response);

        assert.equal(res.statusCode, 200);
        assert.equal(res.jsonData.success, true);
        assert.deepEqual(res.jsonData.data, mockWallets);
    } finally {
        (
            walletRepository as unknown as {
                find: typeof walletRepository.find;
            }
        ).find = originalFind;
    }
});

test('wallet routes reject unauthenticated requests', async () => {
    const app = express();
    app.use('/wallets', walletRoutes);

    const server = app.listen(0);
    await new Promise<void>((resolve) =>
        server.once('listening', () => resolve())
    );

    try {
        const address = server.address() as AddressInfo;
        const response = await fetch(
            `http://127.0.0.1:${address.port}/wallets`
        );
        const payload = await response.json();

        assert.equal(response.status, 401);
        assert.equal(payload.success, false);
        assert.equal(payload.error.code, 'AUTH_MISSING_TOKEN');
    } finally {
        server.close();
    }
});

test('requireAdminApi rejects non-admin requests', async () => {
    const res = createMockResponse();
    const req = {
        auth: {
            userId: 'user-123',
            claims: { role: 'user' },
        },
    } as IRequest;

    const next = () => {
        throw new Error('next should not be called');
    };

    const result = requireAdminApi(req, res as unknown as Response, next);

    assert.equal(result, undefined);
    assert.equal(res.statusCode, 403);
    assert.equal(res.jsonData.success, false);
    assert.equal(res.jsonData.error.code, 'FORBIDDEN');
});

test('listWallets returns DB_NOT_READY when the data source is not initialized', async () => {
    const res = createMockResponse();
    const req = { auth: { userId: 'user-123' } } as IRequest;

    await listWallets(req, res as unknown as Response);

    assert.equal(res.statusCode, 500);
    assert.equal(res.jsonData.success, false);
    assert.equal(res.jsonData.error.code, 'DB_NOT_READY');
    assert.match(res.jsonData.error.message, /Database not initialized/);
});
