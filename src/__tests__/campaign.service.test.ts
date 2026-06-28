import test from 'node:test';
import assert from 'node:assert/strict';

import { CampaignService } from '../components/v1/campaign/campaign.service';
import type CampaignEntity from '../components/v1/campaign/campaign.entity';
import type AuditLogEntity from '../components/v1/audit/auditLog.entity';
import type WalletEntity from '../components/v1/wallet/wallet.entity';
import type UserEntity from '../components/v1/user/user.entity';
import type { CairoCampaignClient } from '../services/cairo/campaignFactory.client';

type MockQB = {
    update: () => MockQB;
    set: (_values: Record<string, any>) => MockQB;
    where: (_clause: string, _params: Record<string, any>) => MockQB;
    execute: () => Promise<void>;
};

type Repo<T> = {
    data: T[];
    findOne: (_arg: any) => Promise<T | null>;
    create: (_partial: Partial<T>) => T;
    save: (_entity: any) => Promise<any>;
    update: (_criteria: any, _partial: Partial<T>) => Promise<void>;
    createQueryBuilder: () => MockQB;
};

const makeRepo = <T extends Record<string, any>>(
    match: (item: T, where: any) => boolean
): Repo<T> => {
    const repo: Repo<T> = {
        data: [],
        async findOne(arg: any) {
            const where = arg?.where ?? {};
            return repo.data.find((d) => match(d, where)) ?? null;
        },
        create(partial: Partial<T>) {
            return partial as T;
        },
        async save(entity: any) {
            const e = entity as T;
            if ((e as any).campaignRef) {
                const dup = repo.data.find(
                    (d) => (d as any).campaignRef === (e as any).campaignRef
                );
                if (dup) {
                    const err = new Error(
                        'duplicate key value violates unique constraint "campaigns_campaign_ref_key"'
                    ) as any;
                    err.code = '23505';
                    err.name = 'QueryFailedError';
                    throw err;
                }
            }
            repo.data.push(e);
            return e;
        },
        async update(criteria: any, partial: Partial<T>) {
            const where = criteria ?? {};
            const idx = repo.data.findIndex((d) => match(d, where));
            if (idx >= 0)
                repo.data[idx] = {
                    ...(repo.data[idx] as any),
                    ...(partial as any),
                };
        },
        createQueryBuilder() {
            let qbWhereClause: string | null = null;
            const qb: MockQB = {
                update() {
                    return qb;
                },
                set(_values: Record<string, any>) {
                    return qb;
                },
                where(clause: string, _params: Record<string, any>) {
                    qbWhereClause = clause;
                    return qb;
                },
                async execute() {
                    if (qbWhereClause && qbWhereClause.includes('id =')) {
                        for (const item of repo.data) {
                            if (
                                typeof (item as any).campaignCount === 'number'
                            ) {
                                (item as any).campaignCount =
                                    ((item as any).campaignCount ?? 0) + 1;
                            }
                        }
                    }
                },
            };
            return qb;
        },
    };
    return repo;
};

const mockCairo: CairoCampaignClient = {
    assertContractAccessible: async () => {},
    createCampaign: async ({ campaignRef }) => ({
        transactionHash: '0xtx',
        campaignId: `onchain_${campaignRef}`,
    }),
};

test('CampaignService rejects duplicate campaign_ref', async () => {
    const campaigns = makeRepo<CampaignEntity>(
        (c, w) => c.campaignRef === w.campaignRef
    );
    const audits = makeRepo<AuditLogEntity>(() => false);
    const wallets = makeRepo<WalletEntity>(
        (w, where) => w.address === where.address
    );
    const users = makeRepo<UserEntity>(() => false);

    await wallets.save({ address: '0x1', balance: '0.1' } as any);
    await campaigns.save({ campaignRef: 'ABCDE' } as any);

    const service = new CampaignService(
        campaigns as any,
        audits as any,
        wallets as any,
        users as any,
        mockCairo
    );

    let err: any;
    try {
        await service.createCampaign({
            userId: 'u1',
            walletAddress: '0x1',
            campaignRef: 'ABCDE',
            targetAmount: '1',
            donationToken: '0x2',
        });
    } catch (e) {
        err = e;
    }

    assert.ok(err);
    assert.equal(err.code, 'DUPLICATE_CAMPAIGN_REF');
});

test('CampaignService requires wallet and sufficient balance', async () => {
    const campaigns = makeRepo<CampaignEntity>(() => false);
    const audits = makeRepo<AuditLogEntity>(() => false);
    const wallets = makeRepo<WalletEntity>(
        (w, where) => w.address === where.address
    );
    const users = makeRepo<UserEntity>((u, where) => u.id === where.id);

    const service = new CampaignService(
        campaigns as any,
        audits as any,
        wallets as any,
        users as any,
        mockCairo
    );

    let missingWalletErr: any;
    try {
        await service.createCampaign({
            userId: 'u1',
            walletAddress: '0x1',
            campaignRef: 'ABCDE',
            targetAmount: '1',
            donationToken: '0x2',
        });
    } catch (e) {
        missingWalletErr = e;
    }
    assert.ok(missingWalletErr);
    assert.equal(missingWalletErr.code, 'WALLET_NOT_FOUND');

    await wallets.save({ address: '0x1', balance: '0' } as any);
    let insufficientErr: any;
    try {
        await service.createCampaign({
            userId: 'u1',
            walletAddress: '0x1',
            campaignRef: 'ABCDE',
            targetAmount: '1',
            donationToken: '0x2',
        });
    } catch (e) {
        insufficientErr = e;
    }
    assert.ok(insufficientErr);
    assert.equal(insufficientErr.code, 'INSUFFICIENT_BALANCE');
});

test('CampaignService persists campaign and audit log and increments user count', async () => {
    const campaigns = makeRepo<CampaignEntity>(() => false);
    const audits = makeRepo<AuditLogEntity>(() => false);
    const wallets = makeRepo<WalletEntity>(
        (w, where) => w.address === where.address
    );
    const users = makeRepo<UserEntity>((u, where) => u.id === where.id);

    await wallets.save({ address: '0x1', balance: '0.1' } as any);
    await users.save({ id: 'u1', campaignCount: 0 } as any);

    const service = new CampaignService(
        campaigns as any,
        audits as any,
        wallets as any,
        users as any,
        mockCairo
    );

    const saved = await service.createCampaign({
        userId: 'u1',
        walletAddress: '0x1',
        campaignRef: 'ABCDE',
        targetAmount: '123',
        donationToken: '0x2',
    });

    assert.equal(saved.campaignId, 'onchain_ABCDE');
    assert.equal(campaigns.data.length, 1);
    assert.equal(audits.data.length, 1);
    assert.equal((users.data[0] as any).campaignCount, 1);
});
