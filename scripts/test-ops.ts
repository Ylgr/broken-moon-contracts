import {ethers} from "hardhat";

const ops = [{
    "callData": "0xb61d27f60000000000000000000000002ef8aa35647530ee276fcbce2e639f86d8b7f1eb000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000044a9059cbb000000000000000000000000eabcd21b75349c59a4177e10ed17fbf2955fe6970000000000000000000000000000000000000000000000056bc75e2d6310000000000000000000000000000000000000000000000000000000000000",
    "nonce": "0",
    "initCode": "0x",
    "sender": "0xD42DEF46F1486b116bA60A3E6286F046b542c65f",
    "callGasLimit": 500000,
    "verificationGasLimit": 500000,
    "preVerificationGas": 500000,
    "maxFeePerGas": 112,
    "maxPriorityFeePerGas": 82,
    "paymasterAndData": "0x",
    "signature": "0xf1d5fc54fdcba3e31db73788e693d21c82884cf40a0c365a4510ca853ffa38e9031cbcd011990b7b8c316f02bf3c302556411a447fd48819b3c7b8beef6a421c1b"
}]

const main = async () => {
    const entryPoint = await ethers.getContractAt("EntryPoint", "0x0Dea81090663911A57f1cEc9569e55FD852E5dD3");
    const tx = await entryPoint.handleOps(ops as any, '0xD42DEF46F1486b116bA60A3E6286F046b542c65f' as any);
    try {
        console.log(await tx.wait());
    } catch (e) {
        console.log(e);
    }
}

main().then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
