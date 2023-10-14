import { ethers } from 'ethers';
import { TypedDataDomain } from 'ethers'
import { SourceToken } from 'src/typechain-types';


export interface SignPermitDetails {
    tokenContract: ethers.Contract | SourceToken;
    tokenName: string;
    tokenSymbol: string;
    tokenAddress: string;
    bridgeAddress: string;
    amount: string;
}

export async function signPermit(wallet: ethers.Wallet, signPermitDetails: SignPermitDetails) {

    const nonce = await signPermitDetails.tokenContract.nonces(wallet.address);
    const deadline = Math.floor(Date.now() / 1000) + 60 * 60;

    const domain: TypedDataDomain = {
        name: signPermitDetails.tokenName,
        version: '1',
        verifyingContract: signPermitDetails.tokenAddress,
        chainId: '31337'
    };

    const Permit = [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' }
    ];
    let hexNonce = nonce.toString(16);

    const message = {
        owner: wallet.address,
        spender: signPermitDetails.bridgeAddress,
        value: signPermitDetails.amount,
        nonce: hexNonce,
        deadline
    };

    const signatureLike = await wallet.signTypedData(domain, { Permit }, message);
    const splitSig = ethers.Signature.from(signatureLike);
    return {
        deadline,
        v: splitSig.v,
        r: splitSig.r,
        s: splitSig.s
    };
}
