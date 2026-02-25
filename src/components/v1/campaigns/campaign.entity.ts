import { Entity, PrimaryColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('campaigns')
@Index('campaigns_campaign_ref_idx', ['campaign_ref'], { unique: true })
export class CampaignEntity {
    @PrimaryColumn('varchar', { name: 'campaign_id' })
    campaign_id: string;

    @Column('varchar', { name: 'campaign_ref' })
    campaign_ref: string;

    @Column('varchar', { name: 'target_amount' })
    target_amount: string;

    @Column('varchar', { name: 'donation_token', nullable: true })
    donation_token: string | null;

    @Column('varchar', { name: 'transaction_hash', nullable: true })
    transaction_hash: string | null;

    @Column('varchar', { name: 'user_id' })
    user_id: string;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    created_at: Date;
}
