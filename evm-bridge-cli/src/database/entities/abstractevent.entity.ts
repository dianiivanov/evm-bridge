import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

export abstract class AbstractEventEntity {
    constructor(amountOwner: string, amount: bigint, blockchainName: string) {
        this.amountOwner = amountOwner;
        this.amount = amount;
        this.blockchainName = blockchainName;
    }
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;

    @Column({ type: 'bigint' })
    amount: bigint;

    @Column()
    amountOwner: string;

    @Column()
    blockchainName: string;
}