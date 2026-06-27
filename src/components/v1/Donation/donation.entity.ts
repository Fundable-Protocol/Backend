import {
    Entity,
    Column,
    PrimaryColumn,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
    BeforeInsert,
} from 'typeorm';
import { uuid } from '../../../utils';
import { DonationStatus, Network } from '../../../types/enums';

@Entity('donations')
@Index('donations_campaign_id_idx', ['campaignId'])
@Index('donations_donor_address_idx', ['donorAddress'])
@Index('donations_status_idx', ['status'])
@Index('donations_created_at_idx', ['createdAt'])
@Index('donations_transaction_hash_idx', ['transactionHash'])
export class DonationEntity {
    @PrimaryColumn('text')
    id: string;

    @Column('text', { name: 'campaign_id', nullable: false })
    campaignId: string;

    @Column('text', { name: 'campaign_ref', nullable: true })
    campaignRef: string | null;

    @Column('text', { name: 'campaign_title', nullable: true })
    campaignTitle: string | null;

    @Column('text', { name: 'donor_id', nullable: true })
    donorId: string | null;

    @Column('text', { name: 'donor_address', nullable: false })
    donorAddress: string;

    @Column('text', { name: 'donor_name', nullable: true })
    donorName: string | null;

    @Column('text', { name: 'transaction_hash', nullable: true })
    transactionHash: string | null;

    @Column('bigint', { name: 'block_number', nullable: true })
    blockNumber: number | null;

    @Column('timestamp', {
        name: 'block_timestamp',
        precision: 3,
        nullable: true,
    })
    blockTimestamp: Date | null;

    @Column('decimal', {
        name: 'gas_fee',
        precision: 65,
        scale: 30,
        default: '0',
    })
    gasFee: string;

    @Column('decimal', {
        name: 'amount',
        precision: 65,
        scale: 30,
        nullable: false,
    })
    amount: string;

    @Column('decimal', {
        name: 'usd_amount',
        precision: 65,
        scale: 30,
        default: '0',
    })
    usdAmount: string;

    @Column('text', { name: 'token_address', nullable: false })
    tokenAddress: string;

    @Column('text', { name: 'token_symbol', nullable: false })
    tokenSymbol: string;

    @Column('integer', { name: 'token_decimals', nullable: false })
    tokenDecimals: number;

    @Column({
        type: 'enum',
        enum: DonationStatus,
        default: DonationStatus.PENDING,
        nullable: false,
    })
    status: DonationStatus;

    @Column('timestamp', { name: 'confirmed_at', precision: 3, nullable: true })
    confirmedAt: Date | null;

    @Column('boolean', { name: 'is_anonymous', default: false })
    isAnonymous: boolean;

    @Column('text', { nullable: true })
    message: string | null;

    @Column({
        type: 'enum',
        enum: Network,
        default: Network.MAINNET,
        nullable: false,
    })
    network: Network;

    @CreateDateColumn({
        name: 'created_at',
        type: 'timestamp',
        precision: 3,
    })
    createdAt: Date;

    @UpdateDateColumn({
        name: 'updated_at',
        type: 'timestamp',
        precision: 3,
    })
    updatedAt: Date;

    @BeforeInsert()
    generateId() {
        if (!this.id) {
            this.id = uuid();
        }
    }
}

export default DonationEntity;
