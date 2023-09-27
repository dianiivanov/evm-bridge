import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { AbstractEventEntity } from './abstractevent.entity';

@Entity()
export class TokenReleased  extends AbstractEventEntity {
  constructor(amountOwner: string, releasedTokenAddress: string, amount: number, blockchainName: string) {
    super(amountOwner, amount, blockchainName);
    this.releasedTokenAddress = releasedTokenAddress;
  }
  @Column()
  releasedTokenAddress: string;
}