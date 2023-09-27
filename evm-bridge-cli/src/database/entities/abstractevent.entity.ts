import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

export abstract class AbstractEventEntity {
    constructor(amountOwner: string, amount: number, blockchainName: string) {
        this.amountOwner = amountOwner;
        this.amount = amount;
        this.blockchainName = blockchainName;
    }
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;

    @Column()
    amount: number;

    @Column()
    amountOwner: string;

    @Column()
    blockchainName: string;
}