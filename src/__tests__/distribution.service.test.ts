import test from 'node:test';
import assert from 'node:assert/strict';

import {
    DistributionNotFoundError,
    DistributionService,
} from '../components/v1/distribution/distribution.service';
import type DistributionEntity from '../components/v1/distribution/distribution.entity';
import { DistributionStatus, DistributionType, Network } from '../types/enums';

type Repo<T> = {
    data: T[];
    findOne: (_arg: any) => Promise<T | null>;
    find: (_arg?: any) => Promise<T[]>;
    create: (_partial: Partial<T>) => T;
    save: (_entity: any) => Promise<any>;
};

const makeRepo = <T extends Record<string, any>>(): Repo<T> => {
    const repo: Repo<T> = {
        data: [],
        async findOne(arg: any) {
            const where = arg?.where ?? {};
            return (
                repo.data.find((d) =>
                    Object.keys(where).every((k) => (d as any)[k] === where[k])
                ) ?? null
            );
        },
        async find(arg?: any) {
            const take = arg?.take ?? repo.data.length;
            return repo.data.slice(0, take);
        },
        create(partial: Partial<T>) {
            return { ...partial } as T;
        },
        async save(entity: any) {
            const e = { ...entity } as any;
            if (!e.id) e.id = `dist_${repo.data.length + 1}`;
            if (!e.createdAt) e.createdAt = new Date();
            const idx = repo.data.findIndex((d) => (d as any).id === e.id);
            if (idx >= 0) repo.data[idx] = e;
            else repo.data.push(e);
            return e;
        },
    };
    return repo;
};

const validUser = '0xABCDEF1234567890ABCDEF1234567890ABCDEF12';
const validToken = '0x1234567890ABCDEF1234567890ABCDEF12345678';

const baseCreate = {
    userAddress: validUser,
    tokenAddress: validToken,
    tokenSymbol: 'usdc',
    tokenDecimals: 6,
    totalAmount: '1000',
    feeAmount: '10',
    totalRecipients: 5,
    distributionType: DistributionType.AIRDROP,
};

test('DistributionService.createDistribution normalizes addresses and symbol', async () => {
    const repo = makeRepo<DistributionEntity>();
    const service = new DistributionService(repo as any);

    const result = await service.createDistribution(baseCreate as any);

    assert.equal(result.userAddress, validUser.toLowerCase());
    assert.equal(result.tokenAddress, validToken.toLowerCase());
    assert.equal(result.tokenSymbol, 'USDC');
    assert.equal(result.status, DistributionStatus.PENDING);
    assert.equal(result.network, Network.MAINNET);
    assert.equal(repo.data.length, 1);
});

test('DistributionService.createDistribution computes totalUsdAmount from usdRate', async () => {
    const repo = makeRepo<DistributionEntity>();
    const service = new DistributionService(repo as any);

    const result = await service.createDistribution({
        ...baseCreate,
        usdRate: '2',
    } as any);

    assert.equal(result.usdRate, '2');
    assert.equal(result.totalUsdAmount, '2000');
});

test('DistributionService.createDistribution defaults usd values to zero', async () => {
    const repo = makeRepo<DistributionEntity>();
    const service = new DistributionService(repo as any);

    const result = await service.createDistribution(baseCreate as any);

    assert.equal(result.usdRate, '0');
    assert.equal(result.totalUsdAmount, '0');
});

test('DistributionService.createDistribution wraps repository failures', async () => {
    const repo = makeRepo<DistributionEntity>();
    repo.save = async () => {
        throw new Error('db down');
    };
    const service = new DistributionService(repo as any);

    await assert.rejects(
        () => service.createDistribution(baseCreate as any),
        /Failed to create distribution/
    );
});

test('DistributionService.updateDistribution throws DistributionNotFoundError for missing id', async () => {
    const repo = makeRepo<DistributionEntity>();
    const service = new DistributionService(repo as any);

    let err: any;
    try {
        await service.updateDistribution('missing', { tokenSymbol: 'dai' } as any);
    } catch (e) {
        err = e;
    }

    assert.ok(err instanceof DistributionNotFoundError);
    assert.equal(err.code, 'DISTRIBUTION_NOT_FOUND');
});

test('DistributionService.updateDistribution normalizes and recomputes usd amount', async () => {
    const repo = makeRepo<DistributionEntity>();
    const service = new DistributionService(repo as any);

    const created = await service.createDistribution(baseCreate as any);

    const updated = await service.updateDistribution(created.id, {
        tokenSymbol: 'dai',
        userAddress: validUser,
        totalAmount: '500',
        usdRate: '3',
        status: DistributionStatus.COMPLETED,
    } as any);

    assert.equal(updated.tokenSymbol, 'DAI');
    assert.equal(updated.userAddress, validUser.toLowerCase());
    assert.equal(updated.totalUsdAmount, '1500');
    assert.equal(updated.status, DistributionStatus.COMPLETED);
});

test('DistributionService.listDistributions returns formatted responses', async () => {
    const repo = makeRepo<DistributionEntity>();
    const service = new DistributionService(repo as any);

    await service.createDistribution(baseCreate as any);
    await service.createDistribution(baseCreate as any);

    const result = await service.listDistributions();
    assert.equal(result.length, 2);
    assert.equal(result[0].tokenSymbol, 'USDC');
});

test('DistributionService.listDistributions wraps repository failures', async () => {
    const repo = makeRepo<DistributionEntity>();
    repo.find = async () => {
        throw new Error('db down');
    };
    const service = new DistributionService(repo as any);

    await assert.rejects(
        () => service.listDistributions(),
        /Failed to list distributions/
    );
});
