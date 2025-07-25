import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('campaigns')
export class Campaign {
  @PrimaryColumn('varchar')
  campaign_id: string;

  @Column('varchar', { unique: true })
  campaign_ref: string;

  @Column('varchar')
  target_amount: string;

  @Column('varchar')
  donation_token: string;

  @Column('varchar')
  transaction_hash: string;

  @Column('varchar')
  user_id: string;

  @Column('varchar')
  created_at: string;
}
