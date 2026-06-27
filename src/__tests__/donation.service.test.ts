import test from 'node:test';
import assert from 'node:assert/strict';

import { DonationService } from '../components/v1/Donation/donation.service';
import type { DonationEntity } from '../components/v1/Donation/donation.entity';
import { DonationStatus } from '../types/enums';

const extractColName = (clause: string): string | null => {
    const match = clause.match(/\.(\w+)\s*=/);
    return match ? match[1] : null;
};

type MockWhereEntry = {
    col: string | null;
    paramKey: string;
    value: any;
};

type MockQueryBuilder = {
    _wheres: MockWhereEntry[];
    _orderBy: [string, 'ASC' | 'DESC'] | null;
    _skip: number | null;
    _take: number | null;
    where: (_clause: string, _params: Record<string, any>) => MockQueryBuilder;
    andWhere: (
        _clause: string,
        _params: Record<string, any>
    ) => MockQueryBuilder;
    orderBy: (_col: string, _dir: 'ASC' | 'DESC') => MockQueryBuilder;
    skip: (_n: number) => MockQueryBuilder;
    take: (_n: number) => MockQueryBuilder;
    getCount: () => Promise<number>;
    getMany: () => Promise<any[]>;
    select: (_expr: string, _alias: string) => MockQueryBuilder;
    addSelect: (_expr: string, _alias: string) => MockQueryBuilder;
    getRawOne: <T>() => Promise<T | null>;
};

const makeMockQB = (data: () => any[]): MockQueryBuilder => {
    const mock: MockQueryBuilder = {
        _wheres: [],
        _orderBy: null,
        _skip: null,
        _take: null,

        where(clause: string, params: Record<string, any>) {
            mock._wheres = Object.entries(params).map(([key, value]) => ({
                col: extractColName(clause),
                paramKey: key,
                value,
            }));
            return mock;
        },
        andWhere(clause: string, params: Record<string, any>) {
            for (const [key, value] of Object.entries(params)) {
                mock._wheres.push({
                    col: extractColName(clause),
                    paramKey: key,
                    value,
                });
            }
            return mock;
        },
        orderBy(col: string, dir: 'ASC' | 'DESC') {
            mock._orderBy = [col, dir];
            return mock;
        },
        skip(n: number) {
            mock._skip = n;
            return mock;
        },
        take(n: number) {
            mock._take = n;
            return mock;
        },
        async getCount() {
            const items = data();
            return items.filter((item) => {
                for (const entry of mock._wheres) {
                    const col = entry.col ?? entry.paramKey;
                    if ((item as any)[col] !== entry.value) return false;
                }
                return true;
            }).length;
        },
        async getMany() {
            let items = data().filter((item) => {
                for (const entry of mock._wheres) {
                    const col = entry.col ?? entry.paramKey;
                    if ((item as any)[col] !== entry.value) return false;
                }
                return true;
            });

            if (mock._orderBy) {
                const [col, dir] = mock._orderBy;
                items = [...items].sort((a: any, b: any) => {
                    const colName = col.split('.').pop() ?? col;
                    const aVal = a[colName] ?? '';
                    const bVal = b[colName] ?? '';
                    const cmp =
                        typeof aVal === 'string'
                            ? aVal.localeCompare(bVal)
                            : Number(aVal) - Number(bVal);
                    return dir === 'DESC' ? -cmp : cmp;
                });
            }

            const skip = mock._skip ?? 0;
            const take = mock._take ?? items.length;
            return items.slice(skip, skip + take);
        },

        select(_expr: string, _alias: string) {
            return mock;
        },
        addSelect(_expr: string, _alias: string) {
            return mock;
        },
        async getRawOne<T>(): Promise<T | null> {
            const items = data();
            const campEntry = mock._wheres.find(
                (e) => e.paramKey === 'campaignId'
            );
            const filtered = campEntry
                ? items.filter((d) => (d as any).campaignId === campEntry.value)
                : items;

            const totalDonations = filtered.length;
            const totalAmount = filtered.reduce(
                (s, d) => s + Number((d as any).amount),
                0
            );
            const totalUsdAmount = filtered.reduce(
                (s, d) => s + Number((d as any).usdAmount ?? 0),
                0
            );
            const uniqueDonors = new Set(
                filtered.map((d) => (d as any).donorAddress)
            ).size;

            return {
                totalDonations: String(totalDonations),
                totalAmount: String(totalAmount),
                totalUsdAmount: String(totalUsdAmount),
                uniqueDonors: String(uniqueDonors),
            } as T;
        },
    };

    return mock;
};

type Repo<T> = {
    data: T[];
    findOne: (_arg: any) => Promise<T | null>;
    find: (_arg?: any) => Promise<T[]>;
    create: (_partial: Partial<T>) => T;
    save: (_entity: any) => Promise<any>;
    createQueryBuilder: (_alias: string) => MockQueryBuilder;
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
        async find() {
            return repo.data;
        },
        create(partial: Partial<T>) {
            return { ...partial } as T;
        },
        async save(entity: any) {
            const e = { id: `don_${repo.data.length + 1}`, ...entity } as T;
            const idx = repo.data.findIndex(
                (d) => (d as any).id === (e as any).id
            );
            if (idx >= 0) repo.data[idx] = e;
            else repo.data.push(e);
            return e;
        },
        createQueryBuilder() {
            return makeMockQB(() => repo.data);
        },
    };

    return repo;
};

test('DonationService.createDonation persists and returns formatted response', async () => {
    const repo = makeRepo<DonationEntity>();
    const service = new DonationService(repo as any);

    const result = await service.createDonation({
        campaignId: 'camp_1',
        donorAddress: '0x1234567890abcdef1234567890abcdef12345678',
        tokenAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
        tokenSymbol: 'USDC',
        tokenDecimals: 6,
        amount: '100.50',
        usdAmount: '100.50',
    });

    assert.equal(result.campaignId, 'camp_1');
    assert.equal(
        result.donorAddress,
        '0x1234567890abcdef1234567890abcdef12345678'
    );
    assert.equal(result.tokenSymbol, 'USDC');
    assert.equal(result.amount, '100.50');
    assert.equal(result.status, DonationStatus.PENDING);
    assert.equal(result.campaignTitle, null);
    assert.equal(repo.data.length, 1);
});

test('DonationService.createDonation stores campaignTitle', async () => {
    const repo = makeRepo<DonationEntity>();
    const service = new DonationService(repo as any);

    const result = await service.createDonation({
        campaignId: 'camp_1',
        campaignTitle: 'Help the kids',
        donorAddress: '0x1234567890abcdef1234567890abcdef12345678',
        tokenAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
        tokenSymbol: 'USDC',
        tokenDecimals: 6,
        amount: '50',
    });

    assert.equal(result.campaignTitle, 'Help the kids');
    assert.equal(repo.data[0].campaignTitle, 'Help the kids');
});

test('DonationService.createDonation normalizes addresses and symbols', async () => {
    const repo = makeRepo<DonationEntity>();
    const service = new DonationService(repo as any);

    const result = await service.createDonation({
        campaignId: 'camp_1',
        donorAddress: '0xABCdef1234567890ABCdef1234567890ABCdef12',
        tokenAddress: '0xDEFabc1234567890DEFabc1234567890DEFabc12',
        tokenSymbol: 'usdc',
        tokenDecimals: 6,
        amount: '50',
    });

    assert.equal(
        result.donorAddress,
        '0xabcdef1234567890abcdef1234567890abcdef12'
    );
    assert.equal(
        result.tokenAddress,
        '0xdefabc1234567890defabc1234567890defabc12'
    );
    assert.equal(result.tokenSymbol, 'USDC');
});

test('DonationService.getDonationById returns null for missing id', async () => {
    const repo = makeRepo<DonationEntity>();
    const service = new DonationService(repo as any);

    const result = await service.getDonationById('nonexistent');
    assert.equal(result, null);
});

test('DonationService.getDonationById returns entity when found', async () => {
    const repo = makeRepo<DonationEntity>();
    const service = new DonationService(repo as any);

    await service.createDonation({
        campaignId: 'camp_1',
        donorAddress: '0x1234567890abcdef1234567890abcdef12345678',
        tokenAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
        tokenSymbol: 'DAI',
        tokenDecimals: 18,
        amount: '200',
    });

    const result = await service.getDonationById(repo.data[0].id);
    assert.notEqual(result, null);
    assert.equal(result!.amount, '200');
});

test('DonationService.listDonations returns paginated results', async () => {
    const repo = makeRepo<DonationEntity>();
    const service = new DonationService(repo as any);

    for (let i = 0; i < 5; i++) {
        await service.createDonation({
            campaignId: `camp_${i}`,
            donorAddress: '0x1234567890abcdef1234567890abcdef12345678',
            tokenAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
            tokenSymbol: 'USDC',
            tokenDecimals: 6,
            amount: String((i + 1) * 10),
        });
    }

    const result = await service.listDonations({
        page: 1,
        limit: 3,
        sort_by: 'created_at',
        sort_order: 'desc',
    });

    assert.equal(result.data.length, 3);
    assert.equal(result.meta.page, 1);
    assert.equal(result.meta.limit, 3);
    assert.equal(result.meta.totalRows, 5);
    assert.equal(result.meta.totalPages, 2);
});

test('DonationService.listDonations sorts by campaign_ref and donor_address', async () => {
    const repo = makeRepo<DonationEntity>();
    const service = new DonationService(repo as any);

    await service.createDonation({
        campaignId: 'camp_b',
        campaignRef: 'B',
        campaignTitle: 'Zoo fundraiser',
        donorAddress: '0x2222222222222222222222222222222222222222',
        tokenAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
        tokenSymbol: 'USDC',
        tokenDecimals: 6,
        amount: '100',
    });
    await service.createDonation({
        campaignId: 'camp_a',
        campaignRef: 'A',
        campaignTitle: 'Animal shelter',
        donorAddress: '0x1111111111111111111111111111111111111111',
        tokenAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
        tokenSymbol: 'USDC',
        tokenDecimals: 6,
        amount: '200',
    });

    const byCampaignAsc = await service.listDonations({
        page: 1,
        limit: 20,
        sort_by: 'campaign_ref',
        sort_order: 'asc',
    });
    assert.equal(byCampaignAsc.data[0].campaignId, 'camp_a');
    assert.equal(byCampaignAsc.data[1].campaignId, 'camp_b');

    const byTitleAsc = await service.listDonations({
        page: 1,
        limit: 20,
        sort_by: 'campaign_title',
        sort_order: 'asc',
    });
    assert.equal(byTitleAsc.data[0].campaignTitle, 'Animal shelter');
    assert.equal(byTitleAsc.data[1].campaignTitle, 'Zoo fundraiser');

    const byDonorAsc = await service.listDonations({
        page: 1,
        limit: 20,
        sort_by: 'donor_address',
        sort_order: 'asc',
    });
    assert.ok(
        byDonorAsc.data[0].donorAddress < byDonorAsc.data[1].donorAddress
    );
});

test('DonationService.listDonations filters by confirmed', async () => {
    const repo = makeRepo<DonationEntity>();
    const service = new DonationService(repo as any);

    await service.createDonation({
        campaignId: 'camp_1',
        donorAddress: '0x1111111111111111111111111111111111111111',
        tokenAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
        tokenSymbol: 'USDC',
        tokenDecimals: 6,
        amount: '100',
    });

    repo.data[0].status = DonationStatus.CONFIRMED;

    const confirmedResult = await service.listDonations({
        page: 1,
        limit: 20,
        sort_by: 'created_at',
        sort_order: 'asc',
        confirmed: true,
    });
    assert.equal(confirmedResult.data.length, 1);

    const unconfirmedResult = await service.listDonations({
        page: 1,
        limit: 20,
        sort_by: 'created_at',
        sort_order: 'asc',
        confirmed: false,
    });
    assert.equal(unconfirmedResult.data.length, 0);
});

test('DonationService.listDonations filters by campaign_id', async () => {
    const repo = makeRepo<DonationEntity>();
    const service = new DonationService(repo as any);

    for (let i = 0; i < 3; i++) {
        await service.createDonation({
            campaignId: 'camp_a',
            donorAddress: '0x1234567890abcdef1234567890abcdef12345678',
            tokenAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
            tokenSymbol: 'USDC',
            tokenDecimals: 6,
            amount: String((i + 1) * 10),
        });
    }
    await service.createDonation({
        campaignId: 'camp_b',
        donorAddress: '0x1234567890abcdef1234567890abcdef12345678',
        tokenAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
        tokenSymbol: 'USDC',
        tokenDecimals: 6,
        amount: '100',
    });

    const result = await service.listDonations({
        page: 1,
        limit: 20,
        sort_by: 'created_at',
        sort_order: 'asc',
        campaign_id: 'camp_a',
    });

    assert.equal(result.data.length, 3);
    assert.equal(result.meta.totalRows, 3);
});

test('DonationService.getDonationStats returns correct aggregation', async () => {
    const repo = makeRepo<DonationEntity>();
    const service = new DonationService(repo as any);

    await service.createDonation({
        campaignId: 'camp_1',
        donorAddress: '0x1111111111111111111111111111111111111111',
        tokenAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
        tokenSymbol: 'USDC',
        tokenDecimals: 6,
        amount: '100',
        usdAmount: '100',
    });

    await service.createDonation({
        campaignId: 'camp_1',
        donorAddress: '0x2222222222222222222222222222222222222222',
        tokenAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
        tokenSymbol: 'USDC',
        tokenDecimals: 6,
        amount: '200',
        usdAmount: '200',
    });

    await service.createDonation({
        campaignId: 'camp_2',
        donorAddress: '0x1111111111111111111111111111111111111111',
        tokenAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
        tokenSymbol: 'USDC',
        tokenDecimals: 6,
        amount: '300',
        usdAmount: '300',
    });

    const allStats = await service.getDonationStats();
    assert.equal(allStats.totalDonations, 3);
    assert.equal(allStats.totalAmount, '600');
    assert.equal(allStats.uniqueDonors, 2);
    assert.equal(allStats.averageAmount, '200');

    const campStats = await service.getDonationStats('camp_1');
    assert.equal(campStats.totalDonations, 2);
    assert.equal(campStats.totalAmount, '300');
    assert.equal(campStats.uniqueDonors, 2);
    assert.equal(campStats.averageAmount, '150');
});
