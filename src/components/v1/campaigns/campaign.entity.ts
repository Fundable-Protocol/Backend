import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('campaigns')
export class Campaign {
  @PrimaryColumn()
  campaign_id: string;

  @Column({ unique: true })
  campaign_ref: string;

  @Column()
  target_amount: string;

  @Column()
  donation_token: string;

  @Column()
  transaction_hash: string;

  @Column()
  user_id: string;

  @Column()
  created_at: string;
}
