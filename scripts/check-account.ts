import {ethers} from "hardhat";

async function main() {
    const localWalletAddress = "0xeaBcd21B75349c59a4177E10ed17FBf2955fE697"

    const bmTokenAddress = "0x2ef8aa35647530EE276fCBCE2E639F86D8B7F1EB"
    const bmToken = await ethers.getContractAt("BMToken", bmTokenAddress);

    const entryPointAddress = "0x0Dea81090663911A57f1cEc9569e55FD852E5dD3";
    const entryPoint = await ethers.getContractAt("EntryPoint", entryPointAddress);

    const accountAddress = "0xeb7144040f78f6dae6751f824fb33c60dbc02340";
    const accountContract = await ethers.getContractAt("BicAccount", accountAddress);
    const isAdmin = await accountContract.isAdmin(localWalletAddress as any);
    console.log(isAdmin);

    const initCallData = bmToken.interface.encodeFunctionData("transfer", ["0xeaBcd21B75349c59a4177E10ed17FBf2955fE697" as any, ethers.parseEther("100") as any]);
    const target = bmTokenAddress;
    const value = ethers.ZeroHash;
    const callDataForEntrypoint = accountContract.interface.encodeFunctionData("execute", [target, value, initCallData]);
    const initCode = "0x";
    const nonce = await entryPoint.getNonce(accountAddress as any, 0 as any);
    const op = {
        sender: accountAddress,
        nonce: nonce,
        initCode: initCode,
        callData: callDataForEntrypoint,
        callGasLimit: 500_000,
        verificationGasLimit: 500_000,
        preVerificationGas: 500_000,
        maxFeePerGas: 112,
        maxPriorityFeePerGas: 82,
        paymasterAndData: "0x",
        signature: "0x"
    }
    const opHash = await entryPoint.getUserOpHash(op as any);
    const [localWallet] = await ethers.getSigners();
    console.log('localWallet: ', localWallet.address)
    const signature = await localWallet.signMessage(opHash);
    op.signature = signature;
    console.log('op: ', op)

    // const validateUserOp = await smartWallet.validateUserOp(op as any, opHash as any, 168000000 as any);
    //
    // console.log('validateUserOp: ', validateUserOp)

    console.log(4)
    await entryPoint.connect(localWallet).handleOps([op] as any, localWalletAddress as any).catch((e) => {
        console.log(e)
    });
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
