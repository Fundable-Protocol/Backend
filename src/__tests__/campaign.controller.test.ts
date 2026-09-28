import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import type { AddressInfo } from 'node:net';

// Provide dummy DB env vars before any module that reads config is imported.
// AppDataSource validates these eagerly at module load; the data source is
// never actually initialized in these tests so isInitialized stays false
// until we patch it.
process.env.DATABASE_HOST ||= 'localhost';
process.env.DATABASE_PORT ||= '5432';
process.env.DATABASE_USERNAME ||= 'test';
process.env.DATABASE_PASSWORD ||= 'test';
process.env.DATABASE_NAME ||= 'test';

// Use the mock Cairo client so no real chain connection is attempted.
process.env.CAIRO_MOCK = 'true';

import campaignRoutes from '../components/v1/campaign/campaign.routes';
import AppDataSource from '../config/persistence/data-source';
import type CampaignEntity from '../components/v1/campaign/campaign.entity';
import type WalletEntity from '../components/v1/wallet/wallet.entity';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal in-memory repository sufficient for campaign controller tests. */
const makeRepo = <T extends Record<string, any>>(
    match: (_item: T, _where: any) => boolean
) => {
    const data: T[] = [];

    const repo: any = {
        data,
        async findOne(arg: any) {
            const where = arg?.where ?? {};
            return data.find((item) => match(item, where)) ?? null;
        },
        create(partial: Partial<T>) {
            return { ...partial } as T;
        },
        async save(entity: any) {
            data.push(entity as T);
            return entity;
        },
        async update(_criteria: any, partial: Partial<T>) {
            const where = _criteria ?? {};
            const idx = data.findIndex((item) => match(item, where));
            if (idx >= 0) data[idx] = { ...(data[idx] as any), ...(partial as any) };
        },
        createQueryBuilder() {
            const qb: any = {
                update() { return qb; },
                set(_v: any) { return qb; },
                where(_c: string, _p: any) { return qb; },
                async execute() {},
            };
            return qb;
        },
    };

    return repo;
};

/**
 * Build an Express app wired up with campaign routes.
 * Repos and the initialisation flag are patched onto AppDataSource so the
 * controller never attempts a real DB connection.
 */
const makeApp = (opts: {
    initialized?: boolean;
    campaignRepo?: any;
    walletRepo?: any;
    auditRepo?: any;
    userRepo?: any;
}) => {
    const {
        initialized = true,
        campaignRepo = makeRepo<CampaignEntity>((c, w) => c.campaignRef === w.campaignRef),
        walletRepo = makeRepo<WalletEntity>((w, where) => w.address === where.address),
        auditRepo = makeRepo(() => false),
        userRepo = makeRepo(() => false),
    } = opts;

    (AppDataSource as any).isInitialized = initialized;
    (AppDataSource as any).getRepository = (entity: any) => {
        const name = typeof entity === 'function' ? entity.name : String(entity);
        if (name === 'CampaignEntity') return campaignRepo;
        if (name === 'WalletEntity') return walletRepo;
        if (name === 'AuditLogEntity') return auditRepo;
        if (name === 'UserEntity') return userRepo;
        return makeRepo(() => false);
    };

    const app = express();
    app.use(express.json());
    app.use('/campaigns', campaignRoutes);
    return app;
};

/** Spin up the app on a random port, make one request, return response + server. */
const makeRequest = async (
    app: express.Express,
    path: string,
    init?: RequestInit
) => {
    const server = app.listen(0);
    await new Promise<void>((resolve) => server.once('listening', () => resolve()));
    const { port } = server.address() as AddressInfo;
    try {
        const response = await fetch(`http://127.0.0.1:${port}${path}`, init);
        return { response, server };
    } catch (error) {
        server.close();
        throw error;
    }
};

const closeServer = (server: any): Promise<void> =>
    new Promise((resolve, reject) =>
        server.close((err?: Error) => (err ? reject(err) : resolve()))
    );

/** Sign a JWT using the same default secret as requireJwtAuthApi. */
const bearerToken = (userId: string, walletAddress = '0x1') =>
    jwt.sign({ sub: userId, walletAddress }, 'secret');

/** Valid campaign body accepted by createCampaignSchema. */
const validBody = () => ({
    campaign_ref: 'ABCDE',
    target_amount: '1000',
    donation_token: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
});

// ---------------------------------------------------------------------------
// Auth tests
// ---------------------------------------------------------------------------

test('POST /campaigns → 401 AUTH_MISSING_TOKEN when no Authorization header', async () => {
    const app = makeApp({});
    const { response, server } = await makeRequest(app, '/campaigns', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(validBody()),
    });

    const body = (await response.json()) as any;
    assert.equal(response.status, 401);
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'AUTH_MISSING_TOKEN');
    await closeServer(server);
});

test('POST /campaigns → 401 AUTH_INVALID_TOKEN when token is malformed', async () => {
    const app = makeApp({});
    const { response, server } = await makeRequest(app, '/campaigns', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            authorization: 'Bearer this.is.not.a.jwt',
        },
        body: JSON.stringify(validBody()),
    });

    const body = (await response.json()) as any;
    assert.equal(response.status, 401);
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'AUTH_INVALID_TOKEN');
    await closeServer(server);
});

test('POST /campaigns → 401 AUTH_INVALID_TOKEN when token is signed with wrong secret', async () => {
    const badToken = jwt.sign({ sub: 'user-1', walletAddress: '0x1' }, 'wrong-secret');
    const app = makeApp({});
    const { response, server } = await makeRequest(app, '/campaigns', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${badToken}`,
        },
        body: JSON.stringify(validBody()),
    });

    const body = (await response.json()) as any;
    assert.equal(response.status, 401);
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'AUTH_INVALID_TOKEN');
    await closeServer(server);
});

test('POST /campaigns → 401 AUTH_INVALID_TOKEN when token has no user identifier claim', async () => {
    const noSubToken = jwt.sign({ walletAddress: '0x1' }, 'secret');
    const app = makeApp({});
    const { response, server } = await makeRequest(app, '/campaigns', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${noSubToken}`,
        },
        body: JSON.stringify(validBody()),
    });

    const body = (await response.json()) as any;
    assert.equal(response.status, 401);
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'AUTH_INVALID_TOKEN');
    await closeServer(server);
});

// ---------------------------------------------------------------------------
// Validation tests
// ---------------------------------------------------------------------------

test('POST /campaigns → 400 VALIDATION_ERROR when campaign_ref is missing', async () => {
    const walletRepo = makeRepo<WalletEntity>((w, where) => w.address === where.address);
    await walletRepo.save({ address: '0x1', balance: '1.0' });
    const app = makeApp({ walletRepo });
    const { response, server } = await makeRequest(app, '/campaigns', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${bearerToken('user-1')}`,
        },
        body: JSON.stringify({ target_amount: '1000', donation_token: '0x1' }),
    });

    const body = (await response.json()) as any;
    assert.equal(response.status, 400);
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    await closeServer(server);
});

test('POST /campaigns → 400 VALIDATION_ERROR when campaign_ref is not exactly 5 chars', async () => {
    const walletRepo = makeRepo<WalletEntity>((w, where) => w.address === where.address);
    await walletRepo.save({ address: '0x1', balance: '1.0' });
    const app = makeApp({ walletRepo });
    const { response, server } = await makeRequest(app, '/campaigns', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${bearerToken('user-1')}`,
        },
        body: JSON.stringify({ ...validBody(), campaign_ref: 'TOOLONG' }),
    });

    const body = (await response.json()) as any;
    assert.equal(response.status, 400);
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    await closeServer(server);
});

test('POST /campaigns → 400 VALIDATION_ERROR when target_amount is missing', async () => {
    const walletRepo = makeRepo<WalletEntity>((w, where) => w.address === where.address);
    await walletRepo.save({ address: '0x1', balance: '1.0' });
    const app = makeApp({ walletRepo });
    const { response, server } = await makeRequest(app, '/campaigns', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${bearerToken('user-1')}`,
        },
        body: JSON.stringify({ campaign_ref: 'ABCDE', donation_token: validBody().donation_token }),
    });

    const body = (await response.json()) as any;
    assert.equal(response.status, 400);
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    await closeServer(server);
});

test('POST /campaigns → 400 VALIDATION_ERROR when target_amount is zero', async () => {
    const walletRepo = makeRepo<WalletEntity>((w, where) => w.address === where.address);
    await walletRepo.save({ address: '0x1', balance: '1.0' });
    const app = makeApp({ walletRepo });
    const { response, server } = await makeRequest(app, '/campaigns', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${bearerToken('user-1')}`,
        },
        body: JSON.stringify({ ...validBody(), target_amount: '0' }),
    });

    const body = (await response.json()) as any;
    assert.equal(response.status, 400);
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    await closeServer(server);
});

test('POST /campaigns → 400 VALIDATION_ERROR when donation_token is not a valid Starknet address', async () => {
    const walletRepo = makeRepo<WalletEntity>((w, where) => w.address === where.address);
    await walletRepo.save({ address: '0x1', balance: '1.0' });
    const app = makeApp({ walletRepo });
    const { response, server } = await makeRequest(app, '/campaigns', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${bearerToken('user-1')}`,
        },
        body: JSON.stringify({ ...validBody(), donation_token: 'not-an-address' }),
    });

    const body = (await response.json()) as any;
    assert.equal(response.status, 400);
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    await closeServer(server);
});

test('POST /campaigns → 400 VALIDATION_ERROR when title exceeds 255 characters', async () => {
    const walletRepo = makeRepo<WalletEntity>((w, where) => w.address === where.address);
    await walletRepo.save({ address: '0x1', balance: '1.0' });
    const app = makeApp({ walletRepo });
    const { response, server } = await makeRequest(app, '/campaigns', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${bearerToken('user-1')}`,
        },
        body: JSON.stringify({ ...validBody(), title: 'a'.repeat(256) }),
    });

    const body = (await response.json()) as any;
    assert.equal(response.status, 400);
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    await closeServer(server);
});

// ---------------------------------------------------------------------------
// DB-not-ready test
// ---------------------------------------------------------------------------

test('POST /campaigns → 500 DB_NOT_READY when data source is not initialized', async () => {
    const app = makeApp({ initialized: false });
    const { response, server } = await makeRequest(app, '/campaigns', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${bearerToken('user-1')}`,
        },
        body: JSON.stringify(validBody()),
    });

    const body = (await response.json()) as any;
    assert.equal(response.status, 500);
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'DB_NOT_READY');
    await closeServer(server);
});

// ---------------------------------------------------------------------------
// Service-level error tests (wallet / balance / duplicate)
// ---------------------------------------------------------------------------

test('POST /campaigns → 400 WALLET_NOT_FOUND when wallet address is not in the database', async () => {
    // walletRepo is empty — no wallet for the requesting address
    const app = makeApp({
        walletRepo: makeRepo<WalletEntity>((w, where) => w.address === where.address),
    });
    const { response, server } = await makeRequest(app, '/campaigns', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${bearerToken('user-1', '0xdeadbeef')}`,
        },
        body: JSON.stringify(validBody()),
    });

    const body = (await response.json()) as any;
    assert.equal(response.status, 400);
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'WALLET_NOT_FOUND');
    await closeServer(server);
});

test('POST /campaigns → 400 INSUFFICIENT_BALANCE when wallet balance is zero', async () => {
    const walletRepo = makeRepo<WalletEntity>((w, where) => w.address === where.address);
    await walletRepo.save({ address: '0x1', balance: '0' });
    const app = makeApp({ walletRepo });
    const { response, server } = await makeRequest(app, '/campaigns', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${bearerToken('user-1')}`,
        },
        body: JSON.stringify(validBody()),
    });

    const body = (await response.json()) as any;
    assert.equal(response.status, 400);
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'INSUFFICIENT_BALANCE');
    await closeServer(server);
});

test('POST /campaigns → 409 DUPLICATE_CAMPAIGN_REF when campaign_ref already has a completed campaign', async () => {
    const walletRepo = makeRepo<WalletEntity>((w, where) => w.address === where.address);
    await walletRepo.save({ address: '0x1', balance: '1.0' });

    // Seed an existing campaign with a transaction hash (fully committed)
    const campaignRepo = makeRepo<CampaignEntity>((c, w) => c.campaignRef === w.campaignRef);
    await campaignRepo.save({
        campaignRef: 'ABCDE',
        transactionHash: '0xexistingtx',
        campaignId: 'existing-id',
    });

    const app = makeApp({ walletRepo, campaignRepo });
    const { response, server } = await makeRequest(app, '/campaigns', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${bearerToken('user-1')}`,
        },
        body: JSON.stringify(validBody()),
    });

    const body = (await response.json()) as any;
    assert.equal(response.status, 409);
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'DUPLICATE_CAMPAIGN_REF');
    await closeServer(server);
});

// ---------------------------------------------------------------------------
// Successful creation
// ---------------------------------------------------------------------------

test('POST /campaigns → 201 with full success payload on valid request', async () => {
    const walletRepo = makeRepo<WalletEntity>((w, where) => w.address === where.address);
    await walletRepo.save({ address: '0x1', balance: '1.0' });

    const auditRepo = makeRepo(() => false);
    const userRepo = makeRepo(() => false);

    const app = makeApp({ walletRepo, auditRepo, userRepo });
    const { response, server } = await makeRequest(app, '/campaigns', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${bearerToken('user-1')}`,
        },
        body: JSON.stringify(validBody()),
    });

    const body = (await response.json()) as any;
    assert.equal(response.status, 201);
    assert.equal(body.success, true);

    // All required fields must be present in the response
    assert.ok(body.data.campaign_id, 'campaign_id should be present');
    assert.equal(body.data.campaign_ref, 'ABCDE');
    assert.equal(body.data.target_amount, '1000');
    assert.equal(body.data.donation_token, validBody().donation_token);
    assert.ok(body.data.transaction_hash, 'transaction_hash should be present');
    assert.ok(body.data.created_at, 'created_at should be present');

    // created_at must be a valid ISO string
    const ts = new Date(body.data.created_at).getTime();
    assert.ok(!Number.isNaN(ts), 'created_at should parse as a valid date');

    await closeServer(server);
});

test('POST /campaigns → 201 accepts an optional title in the response body', async () => {
    const walletRepo = makeRepo<WalletEntity>((w, where) => w.address === where.address);
    await walletRepo.save({ address: '0x1', balance: '1.0' });

    const app = makeApp({ walletRepo });
    const { response, server } = await makeRequest(app, '/campaigns', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${bearerToken('user-1')}`,
        },
        body: JSON.stringify({ ...validBody(), title: 'My Campaign' }),
    });

    const body = (await response.json()) as any;
    assert.equal(response.status, 201);
    assert.equal(body.success, true);
    assert.equal(body.data.title, 'My Campaign');
    await closeServer(server);
});

// ---------------------------------------------------------------------------
// Rate-limit tests
// ---------------------------------------------------------------------------

test('POST /campaigns → 429 RATE_LIMITED after 5 successful requests from the same user', async () => {
    const JWT_SECRET = 'secret';
    const userId = `rate-limit-user-${Date.now()}`;

    // Each attempt needs its own fresh repos to avoid DUPLICATE_CAMPAIGN_REF
    // interfering. We create separate apps but share the same Express instance
    // just for the rate-limiter's in-memory store (keyed by userId).
    // The simplest approach: mount 6 sequential requests through the same app
    // instance, each with a unique campaign_ref.

    const makeWalletRepo = () => {
        const r = makeRepo<WalletEntity>((w, where) => w.address === where.address);
        r.save({ address: '0x1', balance: '1.0' });
        return r;
    };

    // Build one app for all requests — the rate-limiter state is shared.
    const app = express();
    app.use(express.json());

    // Build a fresh set of repos per request so refs don't clash.
    (AppDataSource as any).isInitialized = true;

    const allCampaignRepos: any[] = [];
    let requestCount = 0;

    (AppDataSource as any).getRepository = (entity: any) => {
        const name = typeof entity === 'function' ? entity.name : String(entity);
        if (name === 'WalletEntity') {
            const wr = makeRepo<WalletEntity>((w, where) => w.address === where.address);
            wr.data.push({ address: '0x1', balance: '1.0' } as any);
            return wr;
        }
        if (name === 'CampaignEntity') {
            // Return the repo for the current request slot
            return allCampaignRepos[requestCount] ?? makeRepo(() => false);
        }
        return makeRepo(() => false);
    };

    app.use('/campaigns', campaignRoutes);

    const server = app.listen(0);
    await new Promise<void>((resolve) => server.once('listening', () => resolve()));
    const { port } = server.address() as AddressInfo;

    const refs = ['AAAAA', 'BBBBB', 'CCCCC', 'DDDDD', 'EEEEE', 'FFFFF'];

    for (let i = 0; i < 5; i++) {
        // Allocate a fresh campaign repo for this slot
        allCampaignRepos[i] = makeRepo<CampaignEntity>(
            (c: any, w: any) => c.campaignRef === w.campaignRef
        );
        requestCount = i;

        const res = await fetch(`http://127.0.0.1:${port}/campaigns`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                authorization: `Bearer ${jwt.sign({ sub: userId, walletAddress: '0x1' }, JWT_SECRET)}`,
            },
            body: JSON.stringify({ ...validBody(), campaign_ref: refs[i] }),
        });
        const b = (await res.json()) as any;
        assert.equal(res.status, 201, `request ${i + 1} should succeed, got ${JSON.stringify(b)}`);
    }

    // 6th request must be rate-limited
    const limitedRes = await fetch(`http://127.0.0.1:${port}/campaigns`, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${jwt.sign({ sub: userId, walletAddress: '0x1' }, JWT_SECRET)}`,
        },
        body: JSON.stringify({ ...validBody(), campaign_ref: refs[5] }),
    });

    const limitedBody = (await limitedRes.json()) as any;
    assert.equal(limitedRes.status, 429);
    assert.equal(limitedBody.success, false);
    assert.equal(limitedBody.error.code, 'RATE_LIMITED');
    // Confirm the rate-limit detail fields are present
    assert.equal(limitedBody.error.details.limit, 5);
    assert.equal(limitedBody.error.details.windowSeconds, 3600);

    await closeServer(server);
});

test('POST /campaigns → rate-limiter is keyed by userId, not IP address', async () => {
    // Two different users should each get their own 5-request budget.
    const userA = `user-a-${Date.now()}`;
    const userB = `user-b-${Date.now()}`;

    const makeWalletRepoWith = (addr: string) => {
        const r = makeRepo<WalletEntity>((w, where) => w.address === where.address);
        r.data.push({ address: addr, balance: '1.0' } as any);
        return r;
    };

    const app = express();
    app.use(express.json());

    let slot = 0;
    const campaignRepos: any[] = [];

    (AppDataSource as any).isInitialized = true;
    (AppDataSource as any).getRepository = (entity: any) => {
        const name = typeof entity === 'function' ? entity.name : String(entity);
        if (name === 'WalletEntity') {
            const r = makeRepo<WalletEntity>((w, where) => w.address === where.address);
            r.data.push({ address: '0x1', balance: '1.0' } as any);
            r.data.push({ address: '0x2', balance: '1.0' } as any);
            return r;
        }
        if (name === 'CampaignEntity') {
            return campaignRepos[slot] ?? makeRepo(() => false);
        }
        return makeRepo(() => false);
    };

    app.use('/campaigns', campaignRoutes);

    const server = app.listen(0);
    await new Promise<void>((resolve) => server.once('listening', () => resolve()));
    const { port } = server.address() as AddressInfo;

    const makeRef = (prefix: string, i: number) => `${prefix}${i}`.slice(0, 5).padEnd(5, '0');

    // userA makes 5 requests (should all succeed)
    for (let i = 0; i < 5; i++) {
        campaignRepos[slot] = makeRepo<CampaignEntity>(
            (c: any, w: any) => c.campaignRef === w.campaignRef
        );
        const res = await fetch(`http://127.0.0.1:${port}/campaigns`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                authorization: `Bearer ${jwt.sign({ sub: userA, walletAddress: '0x1' }, 'secret')}`,
            },
            body: JSON.stringify({ ...validBody(), campaign_ref: makeRef('A', i) }),
        });
        assert.equal(res.status, 201, `userA request ${i + 1} should succeed`);
        slot++;
    }

    // userB's first request should still succeed (independent bucket)
    campaignRepos[slot] = makeRepo<CampaignEntity>(
        (c: any, w: any) => c.campaignRef === w.campaignRef
    );
    const resBFirst = await fetch(`http://127.0.0.1:${port}/campaigns`, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${jwt.sign({ sub: userB, walletAddress: '0x2' }, 'secret')}`,
        },
        body: JSON.stringify({ ...validBody(), campaign_ref: 'BFIRS' }),
    });
    assert.equal(resBFirst.status, 201, 'userB first request should succeed despite userA hitting limit');

    await closeServer(server);
});
