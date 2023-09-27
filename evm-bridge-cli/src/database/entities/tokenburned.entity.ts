import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { AbstractEventEntity } from './abstractevent.entity';

@Entity()
export class TokenBurned  extends AbstractEventEntity {
  constructor(amountOwner: string, sourceTokenAddress: string, burnedTokenAddress: string, amount: number, blockchainName: string) {
    super(amountOwner, amount, blockchainName);
    this.sourceTokenAddress = sourceTokenAddress;
    this.burnedTokenAddress = burnedTokenAddress;
  }

  @Column()
  sourceTokenAddress: string;

  @Column()
  burnedTokenAddress: string;
}