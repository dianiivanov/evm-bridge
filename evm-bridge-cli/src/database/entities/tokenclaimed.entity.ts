import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { AbstractEventEntity } from './abstractevent.entity';

@Entity()
export class TokenClaimed  extends AbstractEventEntity {
    constructor(amountOwner: string, sourceTokenAddress: string, claimedTokenAddress: string, amount: bigint, blockchainName: string) {
        super(amountOwner, amount, blockchainName);
        this.sourceTokenAddress = sourceTokenAddress;
        this.claimedTokenAddress = claimedTokenAddress;
    }
    @Column()
    sourceTokenAddress: string;

    @Column()
    claimedTokenAddress: string;
}