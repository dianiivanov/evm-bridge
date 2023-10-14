import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { AbstractEventEntity } from './abstractevent.entity';

@Entity()
export class TokenLocked extends AbstractEventEntity {
  constructor(amountOwner: string, lockedTokenAddress: string, amount: bigint, blockchainName: string) {
    super(amountOwner, amount, blockchainName);
    this.lockedTokenAddress = lockedTokenAddress;
  }
  @Column()
  lockedTokenAddress: string;
}