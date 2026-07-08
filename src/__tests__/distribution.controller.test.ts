import test from 'node:test';
import assert from 'node:assert/strict';

// The controller imports the TypeORM data source, which validates DB env vars at
// module load (via the eagerly-built app config). Provide dummy values BEFORE any
// module that reads config is imported. The data source is never initialized, so
// isInitialized stays false. Imports that pull in config are done dynamically
// inside the tests so these assignments run first.
process.env.DATABASE_HOST ||= 'localhost';
process.env.DATABASE_PORT ||= '5432';
process.env.DATABASE_USERNAME ||= 'test';
process.env.DATABASE_PASSWORD ||= 'test';
process.env.DATABASE_NAME ||= 'test';

type MockRes = {
    statusCode: number;
    body: any;
    status: (code: number) => MockRes;
    json: (payload: any) => MockRes;
};

const makeRes = (): MockRes => {
    const res: MockRes = {
        statusCode: 0,
        body: undefined,
        status(code: number) {
            res.statusCode = code;
            return res;
        },
        json(payload: any) {
            res.body = payload;
            return res;
        },
    };
    return res;
};

type Controller =
    typeof import('../components/v1/distribution/distribution.controller');

let cached: Controller | null = null;
const loadController = async (): Promise<Controller> => {
    if (!cached) {
        cached = await import(
            '../components/v1/distribution/distribution.controller'
        );
    }
    return cached;
};

const sampleDistribution = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    userAddress: '0xuser',
    transactionHash: null,
    tokenAddress: '0xtoken',
    tokenSymbol: 'USDC',
    tokenDecimals: 6,
    totalAmount: '1000',
    feeAmount: '10',
    usdRate: '0',
    totalUsdAmount: '0',
    totalRecipients: 5,
    distributionType: 'airdrop',
    chainName: '',
    status: 'pending',
    blockNumber: null,
    blockTimestamp: null,
    network: 'mainnet',
    createdAt: new Date(),
    metadata: null,
};

test('createDistribution returns 201 with shared success shape', async () => {
    const { createDistribution } = await loadController();
    const service = {
        createDistribution: async () => sampleDistribution,
    };
    const req: any = { body: {} };
    const res = makeRes();

    await createDistribution(() => service as any)(req, res as any);

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.id, sampleDistribution.id);
});

test('createDistribution returns 503 DB_NOT_READY when data source is not initialized', async () => {
    const { createDistribution } = await loadController();
    const req: any = { body: {} };
    const res = makeRes();

    // Use the default resolver, which checks the (uninitialized) data source.
    await createDistribution()(req, res as any);

    assert.equal(res.statusCode, 503);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'DB_NOT_READY');
});

test('createDistribution returns 500 INTERNAL_ERROR for unexpected failures', async () => {
    const { createDistribution } = await loadController();
    const service = {
        createDistribution: async () => {
            throw new Error('boom');
        },
    };
    const req: any = { body: {} };
    const res = makeRes();

    await createDistribution(() => service as any)(req, res as any);

    assert.equal(res.statusCode, 500);
    assert.equal(res.body.error.code, 'INTERNAL_ERROR');
});

test('updateDistribution returns 404 when the distribution is missing', async () => {
    const { updateDistribution } = await loadController();
    const service = {
        updateDistribution: async () => {
            throw Object.assign(new Error('Distribution not found'), {
                code: 'DISTRIBUTION_NOT_FOUND',
            });
        },
    };
    const req: any = { params: { id: 'missing' }, body: {} };
    const res = makeRes();

    await updateDistribution(() => service as any)(req, res as any);

    assert.equal(res.statusCode, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'DISTRIBUTION_NOT_FOUND');
});

test('updateDistribution returns 200 on success', async () => {
    const { updateDistribution } = await loadController();
    const service = {
        updateDistribution: async () => ({
            ...sampleDistribution,
            status: 'completed',
        }),
    };
    const req: any = { params: { id: sampleDistribution.id }, body: {} };
    const res = makeRes();

    await updateDistribution(() => service as any)(req, res as any);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, 'completed');
});

test('listDistributions returns 200 with an array payload', async () => {
    const { listDistributions } = await loadController();
    const service = {
        listDistributions: async () => [sampleDistribution],
    };
    const req: any = {};
    const res = makeRes();

    await listDistributions(() => service as any)(req, res as any);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.length, 1);
});

test('policyMiddleware forwards a 400 error for an invalid create body', async () => {
    const { default: policyMiddleware } = await import(
        '../appMiddlewares/policy.middleware'
    );
    const { createDistributionSchema } = await import(
        '../components/v1/distribution/distribution.validation'
    );

    let captured: any;
    const req: any = { body: { userAddress: 'invalid' } };
    const res: any = {};
    const next = (err: any) => {
        captured = err;
    };

    policyMiddleware(createDistributionSchema)(req, res, next);

    assert.ok(captured);
    assert.equal(captured.httpCode, 400);
    assert.equal(captured.type, 'API');
});
