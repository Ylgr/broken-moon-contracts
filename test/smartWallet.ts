import {ethers} from "hardhat";
import {BicAccount, BicAccountFactory, BMToken, EntryPoint} from "../typechain-types";
import {expect} from "chai";
import {Wallet} from "ethers";
import BicAccountBuild from "../artifacts/src/smart-wallet/BicAccount.sol/BicAccount.json";

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
    let bicAccount: BicAccount;
    let bicAccountAddress: string;

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

        const BicAccount = await ethers.getContractFactory("BicAccount");
        bicAccount = await BicAccount.deploy(entryPointAddress, bicAccountFactoryAddress);
        await bicAccount.waitForDeployment();
        bicAccountAddress = await bicAccount.getAddress();

        const BMToken = await ethers.getContractFactory("BMToken");
        bmToken = await BMToken.deploy();
        await bmToken.waitForDeployment();
        bmTokenAddress = await bmToken.getAddress();
    });

    it("should create smart wallet", async () => {
        const smartWalletAddress = await bicAccountFactory.getFunction("getAddress")(user1.address as any, "0x" as any);
        expect(user1.address).equal("0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf");
        expect(smartWalletAddress).equal("0x0909d2AaBe2694E93A05f6333dFF09370DA6FEEE");
        const smartWallet = await ethers.getContractAt("BicAccount", smartWalletAddress);
        console.log(0)

        const initCallData = bicAccountFactory.interface.encodeFunctionData("createAccount", [user1.address as any, ethers.ZeroHash]);
        const target = bicAccountFactoryAddress;
        const value = ethers.ZeroHash;
        console.log(1)

        const callDataForEntrypoint = smartWallet.interface.encodeFunctionData("execute", [target, value, ethers.ZeroHash]);
        console.log(2)
        const initCode = ethers.solidityPacked(
            ["bytes", "bytes"],
            [ethers.solidityPacked(["bytes"], [bicAccountFactoryAddress]), initCallData]
        );
        console.log(3)
        const nonce = await entryPoint.getNonce(smartWalletAddress as any, 0 as any);
        console.log('nonce: ', nonce)

        const op = {
            sender: smartWalletAddress,
            nonce: nonce,
            initCode: initCode,
            callData: callDataForEntrypoint,
            callGasLimit: 500_000,
            verificationGasLimit: 500_000,
            preVerificationGas: 500_000,
            maxFeePerGas: 0,
            maxPriorityFeePerGas: 0,
            paymasterAndData: ethers.ZeroHash,
            signature: ethers.ZeroHash
        }
        console.log('op: ', op)
        const opHash = await entryPoint.getUserOpHash(op as any);
            const signature = await user1.signMessage(ethers.getBytes(opHash));
            op.signature = ethers.solidityPacked(["bytes"], [signature]);
        console.log(4)
        await entryPoint.handleOps([op] as any, admin.address);

        expect(await smartWallet.isAdmin(admin.address)).equal(true);
        expect(await smartWallet.isAdmin(user1.address as any)).equal(true);
    });

    it("should transfer bm token to user 2 (when have ETH on smart wallet)", async () => {
        console.log('admin.address: ', admin.address)
        console.log('user1.address: ', user1.address)
        const smartWalletAddress = await bicAccountFactory.getFunction("getAddress")(user1.address as any, "0x" as any);
        console.log('smartWalletAddress: ', smartWalletAddress)
        const smartWalletAddress2 = await bicAccountFactory.getFunction("getAddress")(user2.address as any, "0x" as any);
        await bmToken.mint(smartWalletAddress as any, ethers.parseEther("1000") as any);
        expect(await bmToken.balanceOf(smartWalletAddress as any)).equal(ethers.parseEther("1000"));

        await admin.sendTransaction({
            to: smartWalletAddress,
            value: ethers.parseEther("1.0")
        });
        const createAccountRes = await bicAccountFactory.createAccount(user1.address as any, "0x" as any);
        // const createAccountRes = await bicAccountFactory.createAccount.staticCall(user1.address as any, "0x" as any);
        const smartWallet: BicAccount = await ethers.getContractAt("BicAccount", smartWalletAddress);
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
        console.log('user1: ', user1.address)
        const signature = await user1.signMessage(ethers.getBytes(opHash));
        op.signature = ethers.solidityPacked(["bytes"], [signature]);
        console.log('op: ', op)

        // const validateUserOp = await smartWallet.validateUserOp(op as any, opHash as any, 168000000 as any);
        //
        // console.log('validateUserOp: ', validateUserOp)

        console.log(4)
        await entryPoint.connect(admin).handleOps([op] as any, admin.address);
        expect(await bmToken.balanceOf(user2.address as any)).equal(ethers.parseEther("100"));
    });
});
// 0xaf3a4e3b3bfa7d75013b7526bec489b9832d2eb3061dcbd5467a4f3620d493185fe1809b7a7ff5a7d1b053e2a0bb4347fa284283e23621407ec64cc0c71a83681b
// 0xf261dd9c7d3dcbabdc9b3b2c6a4991724dbc524f92adfe8e1ee76597d0e0f344649c5a089c6cb0bc80af740e87304eeffad59fd5114cde9cda2c9a5abd74e2cd1b
