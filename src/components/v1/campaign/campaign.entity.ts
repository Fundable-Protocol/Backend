import {
    Entity,
    Column,
    PrimaryColumn,
    CreateDateColumn,
    Index,
    BeforeInsert,
} from 'typeorm';
import { uuid } from '../../../utils';

@Entity('campaigns')
@Index('campaigns_campaign_ref_key', ['campaignRef'], { unique: true })
@Index('campaigns_user_id_idx', ['userId'])
export class CampaignEntity {
    @PrimaryColumn('text', { name: 'campaign_id' })
    campaignId: string;

    @Column('text', { name: 'user_id', nullable: false })
    userId: string;

    @Column('text', { name: 'campaign_ref', nullable: false })
    campaignRef: string;

    @Column('numeric', {
        name: 'target_amount',
        precision: 78,
        scale: 0,
        nullable: false,
    })
    targetAmount: string;

    @Column('text', { name: 'donation_token', nullable: false })
    donationToken: string;

    @Column('text', { nullable: true })
    title: string | null;

    @Column('text', { name: 'transaction_hash', nullable: false })
    transactionHash: string;

    @CreateDateColumn({
        name: 'created_at',
        type: 'timestamp',
        precision: 3,
        default: () => 'CURRENT_TIMESTAMP',
    })
    createdAt: Date;

    @BeforeInsert()
    ensureId() {
        if (!this.campaignId) this.campaignId = uuid();
    }
}

export default CampaignEntity;
