import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('campaign_requests')
export class CampaignRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { nullable: false })
  @Index()
  user_id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
