import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import type { AddressInfo } from 'node:net';

import donationRoutes from '../components/v1/Donation/donation.routes';
import AppDataSource from '../config/persistence/data-source';
import type { DonationEntity } from '../components/v1/Donation/donation.entity';
import { DonationStatus } from '../types/enums';

const makeRepo = () => {
    const data: DonationEntity[] = [];

    const repo: any = {
        data,
        async findOne(arg: any) {
            const where = arg?.where ?? {};
            return (
                data.find((item) =>
                    Object.entries(where).every(
                        ([key, value]) => (item as any)[key] === value
                    )
                ) ?? null
            );
        },
        async find() {
            return data;
        },
        create(partial: Partial<DonationEntity>) {
            return { ...partial } as DonationEntity;
        },
        async save(entity: any) {
            const persisted = {
                id: entity.id ?? `don_${data.length + 1}`,
                ...entity,
                status: entity.status ?? DonationStatus.PENDING,
            } as DonationEntity;
            data.push(persisted);
            return persisted;
        },
        createQueryBuilder() {
            const qb: any = {
                _wheres: [] as Array<{ clause: string; params: Record<string, any> }>,
                where(clause: string, params: Record<string, any>) {
                    qb._wheres = [{ clause, params }];
                    return qb;
                },
                andWhere(clause: string, params: Record<string, any>) {
                    qb._wheres.push({ clause, params });
                    return qb;
                },
                orderBy() {
                    return qb;
                },
                skip() {
                    return qb;
                },
                take() {
                    return qb;
                },
                select() {
                    return qb;
                },
                addSelect() {
                    return qb;
                },
                async getCount() {
                    return data.length;
                },
                async getMany() {
                    return data;
                },
                async getRawOne() {
                    return {
                        totalDonations: String(data.length),
                        totalAmount: String(
                            data.reduce((sum, d) => sum + Number((d as any).amount ?? 0), 0)
                        ),
                        totalUsdAmount: String(
                            data.reduce((sum, d) => sum + Number((d as any).usdAmount ?? 0), 0)
                        ),
                        uniqueDonors: String(
                            new Set(data.map((d) => (d as any).donorAddress)).size
                        ),
                    };
                },
            };
            return qb;
        },
    };

    return repo;
};

const makeApp = (repo: any) => {
    const app = express();
    app.use(express.json());
    (AppDataSource as any).isInitialized = true;
    (AppDataSource as any).getRepository = () => repo;
    app.use('/donations', donationRoutes);
    return app;
};

const makeRequest = async (app: express.Express, path: string, init?: RequestInit) => {
    const server = app.listen(0);
    await new Promise<void>((resolve) => server.once('listening', () => resolve()));

    const address = server.address() as AddressInfo;
    try {
        const response = await fetch(`http://127.0.0.1:${address.port}${path}`, init);
        return { response, server };
    } catch (error) {
        server.close();
        throw error;
    }
};

const closeServer = (server: any) => {
    return new Promise<void>((resolve, reject) => {
        server.close((error?: Error) => {
            if (error) reject(error);
            else resolve();
        });
    });
};

const bearerToken = (userId: string, role?: string) =>
    jwt.sign({ sub: userId, role }, 'secret');

test('POST /donations creates a donation and returns the shared success payload', async () => {
    const repo = makeRepo();
    const app = makeApp(repo);
    const { response, server } = await makeRequest(app, '/donations', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${bearerToken('user_1')}`,
        },
        body: JSON.stringify({
            campaignId: 'camp_1',
            donorAddress: '0x1234567890abcdef1234567890abcdef12345678',
            tokenAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
            tokenSymbol: 'USDC',
            tokenDecimals: 6,
            amount: '125',
            transactionHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef',
        }),
    });

    const body = (await response.json()) as any;
    assert.equal(response.status, 201);
    assert.equal(body.success, true);
    assert.equal(body.data.campaignId, 'camp_1');
    assert.equal(repo.data.length, 1);
    await closeServer(server);
});

test('GET /donations returns an admin-only success response', async () => {
    const repo = makeRepo();
    const app = makeApp(repo);
    const { response, server } = await makeRequest(app, '/donations', {
        method: 'GET',
        headers: {
            authorization: `Bearer ${bearerToken('admin_1', 'admin')}`,
        },
    });

    const body = (await response.json()) as any;
    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.data.length, 0);
    await closeServer(server);
});

test('GET /donations rejects missing auth and returns an auth error', async () => {
    const repo = makeRepo();
    const app = makeApp(repo);
    const { response, server } = await makeRequest(app, '/donations', {
        method: 'GET',
    });

    const body = (await response.json()) as any;
    assert.equal(response.status, 401);
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'AUTH_MISSING_TOKEN');
    await closeServer(server);
});

test('GET /donations rejects non-admin users with a forbidden response', async () => {
    const repo = makeRepo();
    const app = makeApp(repo);
    const { response, server } = await makeRequest(app, '/donations', {
        method: 'GET',
        headers: {
            authorization: `Bearer ${bearerToken('user_1')}`,
        },
    });

    const body = (await response.json()) as any;
    assert.equal(response.status, 403);
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'FORBIDDEN');
    await closeServer(server);
});

test('GET /donations/:id returns 404 for missing donations', async () => {
    const repo = makeRepo();
    const app = makeApp(repo);
    const { response, server } = await makeRequest(
        app,
        '/donations/550e8400-e29b-41d4-a716-446655440000',
        {
            method: 'GET',
            headers: {
                authorization: `Bearer ${bearerToken('user_1')}`,
            },
        }
    );

    const body = (await response.json()) as any;
    assert.equal(response.status, 404);
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'NOT_FOUND');
    await closeServer(server);
});

test('GET /donations/:id returns a donation when present', async () => {
    const repo = makeRepo();
    const donation = await repo.save({
        id: 'don_1',
        campaignId: 'camp_1',
        donorAddress: '0x1234567890abcdef1234567890abcdef12345678',
        tokenAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
        tokenSymbol: 'USDC',
        tokenDecimals: 6,
        amount: '10',
    });
    const app = makeApp(repo);
    const { response, server } = await makeRequest(app, `/donations/${donation.id}`, {
        method: 'GET',
        headers: {
            authorization: `Bearer ${bearerToken('user_1')}`,
        },
    });

    const body = (await response.json()) as any;
    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.id, 'don_1');
    await closeServer(server);
});

test('GET /donations/campaigns/:campaignId returns campaign donations', async () => {
    const repo = makeRepo();
    await repo.save({
        campaignId: 'camp_1',
        donorAddress: '0x1234567890abcdef1234567890abcdef12345678',
        tokenAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
        tokenSymbol: 'USDC',
        tokenDecimals: 6,
        amount: '10',
    });
    const app = makeApp(repo);
    const { response, server } = await makeRequest(app, '/donations/campaigns/camp_1', {
        method: 'GET',
    });

    const body = (await response.json()) as any;
    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.data.length, 1);
    await closeServer(server);
});

test('GET /donations/users/me returns my donations for an authenticated user', async () => {
    const repo = makeRepo();
    await repo.save({
        donorId: 'user_1',
        donorAddress: '0x1234567890abcdef1234567890abcdef12345678',
        tokenAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
        tokenSymbol: 'USDC',
        tokenDecimals: 6,
        amount: '20',
    });
    const app = makeApp(repo);
    const { response, server } = await makeRequest(app, '/donations/users/me', {
        method: 'GET',
        headers: {
            authorization: `Bearer ${bearerToken('user_1')}`,
        },
    });

    const body = (await response.json()) as any;
    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.data.length, 1);
    await closeServer(server);
});

test('GET /donations/users/:userId returns donations for a specific user', async () => {
    const repo = makeRepo();
    await repo.save({
        donorId: 'user_2',
        donorAddress: '0x1234567890abcdef1234567890abcdef12345678',
        tokenAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
        tokenSymbol: 'USDC',
        tokenDecimals: 6,
        amount: '30',
    });
    const app = makeApp(repo);
    const { response, server } = await makeRequest(app, '/donations/users/user_2', {
        method: 'GET',
        headers: {
            authorization: `Bearer ${bearerToken('user_1')}`,
        },
    });

    const body = (await response.json()) as any;
    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.data.length, 1);
    await closeServer(server);
});

test('GET /donations/stats returns donation stats for admins', async () => {
    const repo = makeRepo();
    await repo.save({
        campaignId: 'camp_1',
        donorAddress: '0x1111111111111111111111111111111111111111',
        tokenAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
        tokenSymbol: 'USDC',
        tokenDecimals: 6,
        amount: '100',
    });
    const app = makeApp(repo);
    const { response, server } = await makeRequest(app, '/donations/stats', {
        method: 'GET',
        headers: {
            authorization: `Bearer ${bearerToken('admin_1', 'admin')}`,
        },
    });

    const body = (await response.json()) as any;
    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.totalDonations, 1);
    await closeServer(server);
});

test('POST /donations returns DB_NOT_READY when the data source is unavailable', async () => {
    const repo = makeRepo();
    const app = express();
    app.use(express.json());
    (AppDataSource as any).isInitialized = false;
    (AppDataSource as any).getRepository = () => repo;
    app.use('/donations', donationRoutes);

    const { response, server } = await makeRequest(app, '/donations', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${bearerToken('user_1')}`,
        },
        body: JSON.stringify({
            campaignId: 'camp_1',
            donorAddress: '0x1234567890abcdef1234567890abcdef12345678',
            tokenAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
            tokenSymbol: 'USDC',
            tokenDecimals: 6,
            amount: '125',
        }),
    });

    const body = (await response.json()) as any;
    assert.equal(response.status, 500);
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'DB_NOT_READY');
    await closeServer(server);
});

test('POST /donations returns validation errors from policy middleware', async () => {
    const repo = makeRepo();
    const app = makeApp(repo);
    const { response, server } = await makeRequest(app, '/donations', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${bearerToken('user_1')}`,
        },
        body: JSON.stringify({
            donorAddress: 'invalid-address',
            tokenAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
            tokenSymbol: 'USDC',
            tokenDecimals: 6,
            amount: '125',
        }),
    });

    const body = (await response.json()) as any;
    assert.equal(response.status, 400);
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    await closeServer(server);
});
