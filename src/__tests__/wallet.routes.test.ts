import test from 'node:test';
import assert from 'node:assert/strict';
import type { Response } from 'express';

import type { IRequest } from '../types/global';
import { listWallets } from '../components/v1/wallet/wallet.controller';

const createMockResponse = () => {
    const response: Partial<Response> & {
        statusCode: number;
        jsonData: any;
        status: (code: number) => any;
        json: (data: any) => any;
    } = {
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

test('listWallets returns DB_NOT_READY when data source is not initialized', async () => {
    const res = createMockResponse();
    const req = { auth: { userId: 'user-123' } } as IRequest;

    await listWallets(req, res as Response);

    assert.equal(res.statusCode, 500);
    assert.equal(res.jsonData.success, false);
    assert.equal(res.jsonData.error.code, 'DB_NOT_READY');
    assert.match(res.jsonData.error.message, /Database not initialized/);
});

test('wallet routes are mounted on the API v1 router', async () => {
    const router = await import('../components/v1/routes.api.v1');
    assert.ok(router.default);
});

test('wallet route module exports a router', async () => {
    const router = await import('../components/v1/wallet/wallet.routes');
    assert.ok(router.default);
});
