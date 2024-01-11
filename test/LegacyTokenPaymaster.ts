import {ethers} from "hardhat";
import {parseEther, Wallet} from "ethers";
import {BicAccount, BicAccountFactory, BMToken, EntryPoint, LegacyTokenPaymaster} from "../typechain-types";
import {expect} from "chai";

describe("LegacyTokenPaymaster", () => {
    const {provider} = ethers;
    let admin;
    let user1: Wallet = new ethers.Wallet("0x0000000000000000000000000000000000000000000000000000000000000001", provider)
    let user2: Wallet = new ethers.Wallet("0x0000000000000000000000000000000000000000000000000000000000000002", provider)
    let bicAccountFactory: BicAccountFactory;
    let bicAccountFactoryAddress: string;
    let entryPoint: EntryPoint;
    let entryPointAddress: string;
    let bicAccount: BicAccount;
    let bicAccountAddress: string;
    let beneficiary: string;
    let legacyTokenPaymaster: LegacyTokenPaymaster;
    let legacyTokenPaymasterAddress: string;

    before(async () => {
        [admin, beneficiary] = await ethers.getSigners();
        bicAccountFactory = await ethers.getContractFactory("BicAccount") as BicAccountFactory;
        beneficiary = ethers.Wallet.createRandom().address;
        [admin] = await ethers.getSigners();
        const EntryPoint = await ethers.getContractFactory("EntryPoint");
        entryPoint = await EntryPoint.deploy();
        await entryPoint.waitForDeployment();
        entryPointAddress = await entryPoint.getAddress();

        const BicAccountFactory = await ethers.getContractFactory("BicAccountFactory");
        bicAccountFactory = await BicAccountFactory.deploy(entryPointAddress);
        await bicAccountFactory.waitForDeployment();
        bicAccountFactoryAddress = await bicAccountFactory.getAddress();

        const BicAccount = await ethers.getContractFactory("BicAccount");
        bicAccount = await BicAccount.deploy(entryPointAddress, bicAccountFactoryAddress);
        await bicAccount.waitForDeployment();
        bicAccountAddress = await bicAccount.getAddress();

        const LegacyTokenPaymaster = await ethers.getContractFactory("LegacyTokenPaymaster");
        legacyTokenPaymaster = await LegacyTokenPaymaster.deploy(bicAccountFactoryAddress, 'BM', entryPointAddress);
        await legacyTokenPaymaster.waitForDeployment();
        legacyTokenPaymasterAddress = await legacyTokenPaymaster.getAddress();

        await entryPoint.depositTo(legacyTokenPaymasterAddress as any, { value: parseEther('1000') } as any)
    });

    async function createOp(smartWalletAddress: string, target: string, initCode: string,  initCallData: string, paymasterAndData: string = "0x", chainNonce: BigInt = 0n, user: Wallet = user1): Promise<any> {
        const smartWallet: BicAccount = await ethers.getContractAt("BicAccount", smartWalletAddress);
        const value = ethers.ZeroHash;
        const callDataForEntrypoint = smartWallet.interface.encodeFunctionData("execute", [target, value, initCallData]);
        const nonce = await entryPoint.getNonce(smartWalletAddress as any, 0 as any);
        const op = {
            sender: smartWalletAddress,
            nonce: nonce + chainNonce,
            initCode: initCode,
            callData: callDataForEntrypoint,
            callGasLimit: 5_000_000,
            verificationGasLimit: 5_000_000,
            preVerificationGas: 5_000_000,
            // maxFeePerGas: 0,
            // maxFeePerGas: paymasterAndData === '0x'? 0 : 112,
            maxFeePerGas: 112,
            // maxPriorityFeePerGas: 0,
            maxPriorityFeePerGas: 82,
            paymasterAndData: paymasterAndData,
            signature: "0x"
        }
        const opHash = await entryPoint.getUserOpHash(op as any);
        const signature = await user.signMessage(ethers.getBytes(opHash));
        op.signature = ethers.solidityPacked(["bytes"], [signature]);
        return op;
    }

    it('should be able to use to create account', async () => {
        const smartWalletAddress = await bicAccountFactory.getFunction("getAddress")(user1.address as any, "0x" as any);
        expect(user1.address).equal("0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf");
        expect(smartWalletAddress).equal("0x0909d2AaBe2694E93A05f6333dFF09370DA6FEEE");

        await legacyTokenPaymaster.mintTokens(smartWalletAddress as any, ethers.parseEther('1000') as any);

        const initCallData = bicAccountFactory.interface.encodeFunctionData("createAccount", [user1.address as any, ethers.ZeroHash]);
        const target = bicAccountFactoryAddress;
        const value = ethers.ZeroHash;
        const initCode = ethers.solidityPacked(
            ["bytes", "bytes"],
            [ethers.solidityPacked(["bytes"], [bicAccountFactoryAddress]), initCallData]
        );

        const op = await createOp(smartWalletAddress, target, initCode, '0x', legacyTokenPaymasterAddress, 0n, user1);

        await entryPoint.handleOps([op] as any, admin.address);
        const smartWallet = await ethers.getContractAt("BicAccount", smartWalletAddress);
        expect(await smartWallet.isAdmin(admin.address)).equal(true);
        expect(await smartWallet.isAdmin(user1.address as any)).equal(true);
        console.log('balance after create: ', (await legacyTokenPaymaster.balanceOf(smartWalletAddress as any)).toString());
    })

    it('should be able to transfer tokens while create account', async () => {
        const smartWalletAddress1 = await bicAccountFactory.getFunction("getAddress")(user1.address as any, "0x" as any);
        const smartWalletAddress2 = await bicAccountFactory.getFunction("getAddress")(user2.address as any, "0x" as any);
        await legacyTokenPaymaster.mintTokens(smartWalletAddress1 as any, ethers.parseEther('1000') as any);

        const initCallData = bicAccountFactory.interface.encodeFunctionData("createAccount", [user1.address as any, ethers.ZeroHash]);
        const target = bicAccountFactoryAddress;
        const value = ethers.ZeroHash;
        const initCode = ethers.solidityPacked(
            ["bytes", "bytes"],
            [ethers.solidityPacked(["bytes"], [bicAccountFactoryAddress]), initCallData]
        );
        const createWalletOp = await createOp(smartWalletAddress1, target, initCode, '0x', legacyTokenPaymasterAddress, 0n, user1);

        const transferOp = await createOp(
            smartWalletAddress1,
            legacyTokenPaymasterAddress,
            '0x',
            legacyTokenPaymaster.interface.encodeFunctionData("transfer", [smartWalletAddress2, ethers.parseEther("100")]),
            legacyTokenPaymasterAddress,
            1n,
            user1
        );

        await entryPoint.handleOps([createWalletOp, transferOp] as any, admin.address);

        expect(await legacyTokenPaymaster.balanceOf(smartWalletAddress2 as any)).equal(ethers.parseEther('100'));
        console.log('balance after: ', (await legacyTokenPaymaster.balanceOf(smartWalletAddress1 as any)).toString());
    });

    it('should be able to use oracle for calculate transaction fees', async () => {
        const smartWalletAddress1 = await bicAccountFactory.getFunction("getAddress")(user1.address as any, "0x" as any);
        const smartWalletAddress2 = await bicAccountFactory.getFunction("getAddress")(user2.address as any, "0x" as any);
        await legacyTokenPaymaster.mintTokens(smartWalletAddress1 as any, ethers.parseEther('1000') as any);

        const initCallData = bicAccountFactory.interface.encodeFunctionData("createAccount", [user1.address as any, ethers.ZeroHash]);
        const target = bicAccountFactoryAddress;
        const value = ethers.ZeroHash;
        const initCode = ethers.solidityPacked(
            ["bytes", "bytes"],
            [ethers.solidityPacked(["bytes"], [bicAccountFactoryAddress]), initCallData]
        );
        const createWalletOp = await createOp(smartWalletAddress1, target, initCode, '0x', legacyTokenPaymasterAddress, 0n, user1);

        const transferOp = await createOp(
            smartWalletAddress1,
            legacyTokenPaymasterAddress,
            '0x',
            legacyTokenPaymaster.interface.encodeFunctionData("transfer", [beneficiary, ethers.parseEther("0")]),
            legacyTokenPaymasterAddress,
            1n,
            user1
        );

        await entryPoint.handleOps([createWalletOp, transferOp] as any, admin.address);
        const balanceLeft1 = await legacyTokenPaymaster.balanceOf(smartWalletAddress1 as any);

        const MockOracle = await ethers.getContractFactory("MockOracle");
        const mockOracle = await MockOracle.deploy();
        await mockOracle.waitForDeployment();
        const mockOracleAddress = await mockOracle.getAddress();
        await legacyTokenPaymaster.setOracle(mockOracleAddress as any);
        await legacyTokenPaymaster.mintTokens(smartWalletAddress2 as any, ethers.parseEther('1000') as any);

        const initCallData2 = bicAccountFactory.interface.encodeFunctionData("createAccount", [user2.address as any, ethers.ZeroHash]);
        const target2 = bicAccountFactoryAddress;
        const value2 = ethers.ZeroHash;
        const initCode2 = ethers.solidityPacked(
            ["bytes", "bytes"],
            [ethers.solidityPacked(["bytes"], [bicAccountFactoryAddress]), initCallData2]
        );
        const createWalletOp2 = await createOp(smartWalletAddress2, target2, initCode2, '0x', legacyTokenPaymasterAddress, 0n, user2);

        const transferOp2 = await createOp(
            smartWalletAddress2,
            legacyTokenPaymasterAddress,
            '0x',
            legacyTokenPaymaster.interface.encodeFunctionData("transfer", [beneficiary, ethers.parseEther("0")]),
            legacyTokenPaymasterAddress,
            1n,
            user2
        );

        await entryPoint.handleOps([createWalletOp2, transferOp2] as any, admin.address);
        const balanceLeft2 = await legacyTokenPaymaster.balanceOf(smartWalletAddress2 as any);

        expect((ethers.parseEther('1000') - balanceLeft1)/(ethers.parseEther('1000') - balanceLeft2)).equal(100);
    });
});
