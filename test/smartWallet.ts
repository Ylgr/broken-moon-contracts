import {ethers} from "hardhat";
import {BicAccount, BicAccountFactory, BMToken, EntryPoint} from "../typechain-types";
import {expect} from "chai";
import {Wallet} from "ethers";
import {randomHash} from "hardhat/internal/hardhat-network/provider/utils/random";

describe("smartWallet", () => {
    const {provider} = ethers;
    let admin;
    let user1: Wallet = new ethers.Wallet("0x0000000000000000000000000000000000000000000000000000000000000001", provider)
    let user2: Wallet = new ethers.Wallet("0x0000000000000000000000000000000000000000000000000000000000000002", provider)
    let bicAccountFactory: BicAccountFactory;
    let bicAccountFactoryAddress: string;
    let entryPoint: EntryPoint;
    let bmToken: BMToken;
    let bmTokenAddress: string;

    beforeEach(async () => {
        [admin] = await ethers.getSigners();
        const EntryPoint = await ethers.getContractFactory("EntryPoint");
        entryPoint = await EntryPoint.deploy();
        await entryPoint.waitForDeployment();
        const entryPointAddress = await entryPoint.getAddress();

        const BicAccountFactory = await ethers.getContractFactory("BicAccountFactory");
        bicAccountFactory = await BicAccountFactory.deploy(entryPointAddress);
        await bicAccountFactory.waitForDeployment();
        bicAccountFactoryAddress = await bicAccountFactory.getAddress();

        const BMToken = await ethers.getContractFactory("BMToken");
        bmToken = await BMToken.deploy();
        await bmToken.waitForDeployment();
        bmTokenAddress = await bmToken.getAddress();
    });
    //
    // it("should create smart wallet", async () => {
    //     const smartWalletAddress = await bicAccountFactory.getAddress(user1.address as any, 0 as any);
    //     expect(user1.address).equal("0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf");
    //     expect(smartWalletAddress).equal("0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512");
    //     const smartWallet = await ethers.getContractAt("BicAccount", smartWalletAddress);
    //     console.log(0)
    //
    //     const initCallData = bicAccountFactory.interface.encodeFunctionData("createAccount", [user1.address as any, ethers.ZeroHash]);
    //     const target = bicAccountFactoryAddress;
    //     const value = ethers.ZeroHash;
    //     console.log(1)
    //
    //     const callDataForEntrypoint = smartWallet.interface.encodeFunctionData("execute", [target, value, ethers.ZeroHash]);
    //     console.log(2)
    //     const initCode = ethers.solidityPacked(
    //         ["bytes", "bytes"],
    //         [ethers.solidityPacked(["bytes"], [bicAccountFactoryAddress]), initCallData]
    //     );
    //     console.log(3)
    //     const nonce = await entryPoint.getNonce(smartWalletAddress as any, 0 as any);
    //     console.log('nonce: ', nonce)
    //
    //     const op = {
    //         sender: smartWalletAddress,
    //         nonce: nonce,
    //         initCode: initCode,
    //         callData: callDataForEntrypoint,
    //         callGasLimit: 500_000,
    //         verificationGasLimit: 500_000,
    //         preVerificationGas: 500_000,
    //         maxFeePerGas: 0,
    //         maxPriorityFeePerGas: 0,
    //         paymasterAndData: ethers.ZeroHash,
    //         signature: ethers.ZeroHash
    //     }
    //     console.log('op: ', op)
    //     const opHash = await entryPoint.getUserOpHash(op as any);
    //     const signature = await user1.signMessage(opHash);
    //     // op[11] = signature;
    //     op.signature = signature;
    //     console.log(4)
    //     await entryPoint.handleOps([op] as any, admin.address);
    //
    //     expect(await smartWallet.isAdmin(admin.address)).equal(true);
    //     expect(await smartWallet.isAdmin(user1.address as any)).equal(true);
    // });

    it("should transfer bm token to user 2", async () => {
        const smartWalletAddress = await bicAccountFactory.getAddress(user1.address as any, 0 as any);
        await bmToken.mint(smartWalletAddress as any, ethers.parseEther("1000") as any);
        expect(await bmToken.balanceOf(smartWalletAddress as any)).equal(ethers.parseEther("1000"));
        const createAccountRes = await bicAccountFactory.createAccount(user1.address as any, "0x" as any);
        const smartWallet: BicAccount = await ethers.getContractAt("BicAccount", smartWalletAddress);
        console.log('smartWallet: ', smartWallet)
            expect(await smartWallet.isAdmin(admin.address)).equal(true);
            expect(await smartWallet.isAdmin(user1.address as any)).equal(true);
        const initCallData = bmToken.interface.encodeFunctionData("transfer", [user2.address as any, ethers.parseEther("100") as any]);
        const target = bmTokenAddress;
        const value = ethers.ZeroHash;
        const callDataForEntrypoint = smartWallet.interface.encodeFunctionData("execute", [target, value, initCallData]);
        const initCode = "0x";
        const nonce = await entryPoint.getNonce(smartWalletAddress as any, 0 as any);
        const op = {
            sender: smartWalletAddress,
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
        const signature = await user1.signMessage(opHash);
        op.signature = signature;
        console.log('op: ', op)

        // const validateUserOp = await smartWallet.validateUserOp(op as any, opHash as any, 168000000 as any);
        //
        // console.log('validateUserOp: ', validateUserOp)

        console.log(4)
        await entryPoint.connect(admin).handleOps([op] as any, admin.address);
        expect(await bmToken.balanceOf(user2.address as any)).equal(ethers.parseEther("100"));
    });
});
