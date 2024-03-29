import {ethers} from "hardhat";
import {
    BicAccount,
    BicAccountFactory,
    BMToken,
    DepositPaymaster,
    EntryPoint,
    MockOracle,
    TokenPaymaster
} from "../typechain-types";
import {expect} from "chai";
import {parseEther, Wallet} from "ethers";
import BicAccountBuild from "../artifacts/src/smart-wallet/BicAccount.sol/BicAccount.json";
import {OracleHelper, UniswapHelper} from "../typechain-types/src/smart-wallet/paymaster/TokenPaymaster";

describe("smartWallet", () => {
    const {provider} = ethers;
    let admin;
    let user1: Wallet = new ethers.Wallet("0x0000000000000000000000000000000000000000000000000000000000000001", provider)
    let user2: Wallet = new ethers.Wallet("0x0000000000000000000000000000000000000000000000000000000000000002", provider)
    let bicAccountFactory: BicAccountFactory;
    let bicAccountFactoryAddress: string;
    let entryPoint: EntryPoint;
    let entryPointAddress: string;
    let bmToken: BMToken;
    let bmTokenAddress: string;
    let bicAccount: BicAccount;
    let bicAccountAddress: string;
    let beneficiary: string;

    beforeEach(async () => {
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

        const BMToken = await ethers.getContractFactory("BMToken");
        bmToken = await BMToken.deploy();
        await bmToken.waitForDeployment();
        bmTokenAddress = await bmToken.getAddress();
    });


    async function createOp(smartWalletAddress: string, initCode: string,  initCallData: string, paymasterAndData: string = "0x", chainNonce: BigInt = 0n, user: Wallet = user1): Promise<any> {
        const smartWallet: BicAccount = await ethers.getContractAt("BicAccount", smartWalletAddress);
        const target = bmTokenAddress;
        const value = ethers.ZeroHash;
        const callDataForEntrypoint = smartWallet.interface.encodeFunctionData("execute", [target, value, initCallData]);
        const nonce = await entryPoint.getNonce(smartWalletAddress as any, 0 as any);
        const op = {
            sender: smartWalletAddress,
            nonce: nonce + chainNonce,
            initCode: initCode,
            callData: callDataForEntrypoint,
            callGasLimit: 500_000,
            verificationGasLimit: 500_000,
            preVerificationGas: 500_000,
            // maxFeePerGas: 0,
            maxFeePerGas: paymasterAndData === '0x'? 0 : 112,
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

    async function createAndApproveBmToken(smartWalletAddress: string, approveAddress: string = ethers.ZeroAddress, user: Wallet = user1): Promise<any> {
        const smartWallet: BicAccount = await ethers.getContractAt("BicAccount", smartWalletAddress);
        const initCallData = bicAccountFactory.interface.encodeFunctionData("createAccount", [user.address as any, ethers.ZeroHash]);
        const target = bicAccountFactoryAddress;
        const value = ethers.ZeroHash;

        const callDataForEntrypoint = smartWallet.interface.encodeFunctionData("execute", [target, value, ethers.ZeroHash]);
        const initCode = ethers.solidityPacked(
            ["bytes", "bytes"],
            [ethers.solidityPacked(["bytes"], [bicAccountFactoryAddress]), initCallData]
        );
        const createWalletOp = await createOp(smartWalletAddress, initCode, callDataForEntrypoint, '0x', 0n, user);

        const approveOp = await createOp(smartWalletAddress, "0x", bmToken.interface.encodeFunctionData("approve", [approveAddress, ethers.MaxUint256]), '0x', 1n, user);

        const collect10TokenOp = await createOp(smartWalletAddress, "0x", bmToken.interface.encodeFunctionData("transfer", [approveAddress, ethers.parseEther("10")]), '0x', 2n, user);

        await entryPoint.handleOps([createWalletOp, approveOp, collect10TokenOp] as any, beneficiary as any);
    }

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

        console.log(2)
        const initCode = ethers.solidityPacked(
            ["bytes", "bytes"],
            [ethers.solidityPacked(["bytes"], [bicAccountFactoryAddress]), initCallData]
        );
        console.log(3)
        const createWalletOp = await createOp(smartWalletAddress, initCode, '0x', "0x");

        const approveOp = await createOp(smartWalletAddress, "0x", bmToken.interface.encodeFunctionData("approve", [admin.address as any, ethers.parseEther("1000")]), '0x', 1n);

        await entryPoint.handleOps([createWalletOp, approveOp] as any, admin.address);

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

        console.log(4)
        await entryPoint.connect(admin).handleOps([op] as any, admin.address);
        expect(await bmToken.balanceOf(user2.address as any)).equal(ethers.parseEther("100"));
    });

    it("should transfer bm token to user 2 (using deposit paymaster)", async () => {
        const MockOracle = await ethers.getContractFactory("MockOracle");
        const mockOracle = await MockOracle.deploy();
        await mockOracle.waitForDeployment();
        const mockOracleAddress = await mockOracle.getAddress();

        const DepositPaymaster = await ethers.getContractFactory("DepositPaymaster");
        const depositPaymaster = await DepositPaymaster.deploy(entryPointAddress);
        await depositPaymaster.waitForDeployment();
        const depositPaymasterAddress = await depositPaymaster.getAddress();
        await depositPaymaster.addToken(bmTokenAddress as any, mockOracleAddress as any);
        // await entryPoint.depositTo(depositPaymasterAddress as any, {value: ethers.parseEther("1.0")} as any);
        await depositPaymaster.deposit({value: ethers.parseEther("1.0")} as any);
        expect(await entryPoint.balanceOf(depositPaymasterAddress as any)).equal(ethers.parseEther("1.0"));

        const smartWalletAddress = await bicAccountFactory.getFunction("getAddress")(user1.address as any, "0x" as any);
        console.log('smartWalletAddress: ', smartWalletAddress)
        const smartWalletAddress2 = await bicAccountFactory.getFunction("getAddress")(user2.address as any, "0x" as any);
        await bmToken.mint(smartWalletAddress as any, ethers.parseEther("1000") as any);
        expect(await bmToken.balanceOf(smartWalletAddress as any)).equal(ethers.parseEther("1000"));

        await bmToken.approve(depositPaymasterAddress as any, ethers.parseEther("1.0") as any);
        await depositPaymaster.addDepositFor(bmTokenAddress as any, smartWalletAddress as any, ethers.parseEther("1.0") as any);
        console.log('beneficiary eth before: ', await provider.getBalance(beneficiary))
        await createAndApproveBmToken(smartWalletAddress, depositPaymasterAddress);

        const initCallData = bmToken.interface.encodeFunctionData("transfer", [user2.address as any, ethers.parseEther("100") as any]);

        const transferOp = await createOp(smartWalletAddress, "0x", initCallData, depositPaymasterAddress + bmTokenAddress.slice(2));

        const overTransferInitCallData = bmToken.interface.encodeFunctionData("transfer", [user2.address as any, ethers.parseEther("1000") as any]);
        const overTransferOp = await createOp(smartWalletAddress, "0x", overTransferInitCallData, depositPaymasterAddress + bmTokenAddress.slice(2), 1n);

        const ethAdminBalanceBefore = await provider.getBalance(admin.address);
        console.log('ethAdminBalanceBefore: ', ethAdminBalanceBefore.toString())
        console.log('ethDepositPaymasterBalanceBefore: ', await entryPoint.getDepositInfo(depositPaymasterAddress as any))

        await entryPoint.connect(admin).handleOps([transferOp, overTransferOp] as any, beneficiary as any);

        const ethAdminBalanceAfter = await provider.getBalance(admin.address);
        console.log('ethAdminBalanceAfter: ', ethAdminBalanceAfter.toString())
        console.log('ethDepositPaymasterBalanceAfter: ', await entryPoint.getDepositInfo(depositPaymasterAddress as any))

        console.log('beneficiary eth after: ', await provider.getBalance(beneficiary))
        expect(await bmToken.balanceOf(user2.address as any)).equal(ethers.parseEther("100"));
        // expect(await bmToken.balanceOf(smartWalletAddress as any)).equal(ethers.parseEther("1000")- ethers.parseEther("10") - ethers.parseEther("100") - 6983n - 6309n);
    });

    it("should transfer bm token to user 2 (using deposit paymaster) create and transfer in same transaction", async () => {
        const MockOracle = await ethers.getContractFactory("MockOracle");
        const mockOracle = await MockOracle.deploy();
        await mockOracle.waitForDeployment();
        const mockOracleAddress = await mockOracle.getAddress();

        const DepositPaymaster = await ethers.getContractFactory("DepositPaymaster");
        const depositPaymaster = await DepositPaymaster.deploy(entryPointAddress);
        await depositPaymaster.waitForDeployment();
        const depositPaymasterAddress = await depositPaymaster.getAddress();
        await depositPaymaster.addToken(bmTokenAddress as any, mockOracleAddress as any);
        // await entryPoint.depositTo(depositPaymasterAddress as any, {value: ethers.parseEther("1.0")} as any);
        await depositPaymaster.deposit({value: ethers.parseEther("1.0")} as any);
        expect(await entryPoint.balanceOf(depositPaymasterAddress as any)).equal(ethers.parseEther("1.0"));

        const smartWalletAddress = await bicAccountFactory.getFunction("getAddress")(user1.address as any, "0x" as any);
        console.log('smartWalletAddress: ', smartWalletAddress)
        const smartWalletAddress2 = await bicAccountFactory.getFunction("getAddress")(user2.address as any, "0x" as any);
        await bmToken.mint(smartWalletAddress as any, ethers.parseEther("1000") as any);
        expect(await bmToken.balanceOf(smartWalletAddress as any)).equal(ethers.parseEther("1000"));

        await bmToken.approve(depositPaymasterAddress as any, ethers.parseEther("1.0") as any);
        // await depositPaymaster.addDepositFor(bmTokenAddress as any, smartWalletAddress as any, ethers.parseEther("1.0") as any);
        console.log('beneficiary eth before: ', await provider.getBalance(beneficiary))

        const smartWallet: BicAccount = await ethers.getContractAt("BicAccount", smartWalletAddress);

        const initCreateCallData = bicAccountFactory.interface.encodeFunctionData("createAccount", [user1.address as any, ethers.ZeroHash]);
        const target = bicAccountFactoryAddress;
        const value = ethers.ZeroHash;

        const callDataForEntrypoint = smartWallet.interface.encodeFunctionData("execute", [target, value, ethers.ZeroHash]);
        const initCode = ethers.solidityPacked(
            ["bytes", "bytes"],
            [ethers.solidityPacked(["bytes"], [bicAccountFactoryAddress]), initCreateCallData]
        );
        const createWalletOp = await createOp(smartWalletAddress, initCode, callDataForEntrypoint, '0x', 0n, user1);

        const approveOp = await createOp(smartWalletAddress, "0x", bmToken.interface.encodeFunctionData("approve", [depositPaymasterAddress, ethers.MaxUint256]), '0x', 1n, user1);

        const collect10TokenOp = await createOp(smartWalletAddress, "0x", bmToken.interface.encodeFunctionData("transfer", [depositPaymasterAddress, ethers.parseEther("10")]), '0x', 2n, user1);

        const initCallData = bmToken.interface.encodeFunctionData("transfer", [user2.address as any, ethers.parseEther("100") as any]);

        const transferOp = await createOp(smartWalletAddress, "0x", initCallData, depositPaymasterAddress + bmTokenAddress.slice(2), 3n);

        const overTransferInitCallData = bmToken.interface.encodeFunctionData("transfer", [user2.address as any, ethers.parseEther("1000") as any]);
        const overTransferOp = await createOp(smartWalletAddress, "0x", overTransferInitCallData, depositPaymasterAddress + bmTokenAddress.slice(2), 4n);

        const ethAdminBalanceBefore = await provider.getBalance(admin.address);
        console.log('ethAdminBalanceBefore: ', ethAdminBalanceBefore.toString())
        console.log('ethDepositPaymasterBalanceBefore: ', await entryPoint.getDepositInfo(depositPaymasterAddress as any))

        await entryPoint.connect(admin).handleOps([createWalletOp, approveOp, collect10TokenOp, transferOp, overTransferOp] as any, beneficiary as any);

        const ethAdminBalanceAfter = await provider.getBalance(admin.address);
        console.log('ethAdminBalanceAfter: ', ethAdminBalanceAfter.toString())
        console.log('ethDepositPaymasterBalanceAfter: ', await entryPoint.getDepositInfo(depositPaymasterAddress as any))

        console.log('beneficiary eth after: ', await provider.getBalance(beneficiary))
        expect(await bmToken.balanceOf(user2.address as any)).equal(ethers.parseEther("100"));
        // expect(await bmToken.balanceOf(smartWalletAddress as any)).equal(ethers.parseEther("1000")- ethers.parseEther("10") - ethers.parseEther("100") - 6983n - 6309n);
    });

    it("should user1 and user2 transfer each other in same ops (using deposit paymaster)", async () => {
        const MockOracle = await ethers.getContractFactory("MockOracle");
        const mockOracle = await MockOracle.deploy();
        await mockOracle.waitForDeployment();
        const mockOracleAddress = await mockOracle.getAddress();

        const DepositPaymaster = await ethers.getContractFactory("DepositPaymaster");
        const depositPaymaster = await DepositPaymaster.deploy(entryPointAddress);
        await depositPaymaster.waitForDeployment();
        const depositPaymasterAddress = await depositPaymaster.getAddress();
        await depositPaymaster.addToken(bmTokenAddress as any, mockOracleAddress as any);
        // await entryPoint.depositTo(depositPaymasterAddress as any, {value: ethers.parseEther("1.0")} as any);
        await depositPaymaster.deposit({value: ethers.parseEther("1.0")} as any);
        expect(await entryPoint.balanceOf(depositPaymasterAddress as any)).equal(ethers.parseEther("1.0"));

        const smartWalletAddress1 = await bicAccountFactory.getFunction("getAddress")(user1.address as any, "0x" as any);
        const smartWalletAddress2 = await bicAccountFactory.getFunction("getAddress")(user2.address as any, "0x" as any);
        await bmToken.mint(smartWalletAddress1 as any, ethers.parseEther("1000") as any);
        await bmToken.mint(smartWalletAddress2 as any, ethers.parseEther("20") as any);
        expect(await bmToken.balanceOf(smartWalletAddress1 as any)).equal(ethers.parseEther("1000"));
        expect(await bmToken.balanceOf(smartWalletAddress2 as any)).equal(ethers.parseEther("20"));

        await bmToken.approve(depositPaymasterAddress as any, ethers.parseEther("1.0") as any);
        await depositPaymaster.addDepositFor(bmTokenAddress as any, smartWalletAddress1 as any, ethers.parseEther("1.0") as any);
        console.log('beneficiary eth before: ', await provider.getBalance(beneficiary))
        await createAndApproveBmToken(smartWalletAddress1, depositPaymasterAddress);
        console.log("create wallet 1 done")
        await createAndApproveBmToken(smartWalletAddress2, depositPaymasterAddress, user2);
        console.log("create wallet 2 done")
        const initUser1TransferData = bmToken.interface.encodeFunctionData("transfer", [smartWalletAddress2 as any, ethers.parseEther("100") as any]);
        const user1TransferOp = await createOp(smartWalletAddress1, "0x", initUser1TransferData, depositPaymasterAddress + bmTokenAddress.slice(2));

        const initUser2TransferData = bmToken.interface.encodeFunctionData("transfer", [smartWalletAddress1 as any, ethers.parseEther("50") as any]);
        const user2TransferOp = await createOp(smartWalletAddress2, "0x", initUser2TransferData, depositPaymasterAddress + bmTokenAddress.slice(2), 0n, user2);

        await entryPoint.connect(admin).handleOps([user1TransferOp, user2TransferOp] as any, beneficiary as any);

        // expect(await bmToken.balanceOf(smartWalletAddress1 as any)).equal(ethers.parseEther("940") - 6791n);
        // expect(await bmToken.balanceOf(smartWalletAddress2 as any)).equal(ethers.parseEther("60") - 6439n);

        const user1TransferOp2 = await createOp(smartWalletAddress1, "0x", initUser1TransferData, depositPaymasterAddress + bmTokenAddress.slice(2), 0n);

        const user2TransferOp2 = await createOp(smartWalletAddress2, "0x", initUser2TransferData, depositPaymasterAddress + bmTokenAddress.slice(2), 0n, user2);

        await entryPoint.connect(admin).handleOps([user1TransferOp2, user2TransferOp2] as any, beneficiary as any);

    });

    it("should transfer bm token to user 2 (using token paymaster)", async () => {
        const WrapEth = await ethers.getContractFactory("WrapEth");
        const wrapEth = await WrapEth.deploy();
        await wrapEth.waitForDeployment();
        const wrapEthAddress = await wrapEth.getAddress();

        const TestUniswap = await ethers.getContractFactory("TestUniswap");
        const testUniswap = await TestUniswap.deploy(wrapEthAddress);
        await testUniswap.waitForDeployment();
        const testUniswapAddress = await testUniswap.getAddress();

        const initialPriceToken = 100000000 // USD per BM
        const initialPriceEther = 500000000 // USD per ETH

        const TestOracle2 = await ethers.getContractFactory("TestOracle2");
        const nativeAssetOracle = await TestOracle2.deploy(initialPriceEther, 8);
        await nativeAssetOracle.waitForDeployment();
        const nativeAssetOracleAddress = await nativeAssetOracle.getAddress();

        const tokenOracle = await TestOracle2.deploy(initialPriceToken, 8);
        await tokenOracle.waitForDeployment();
        const tokenOracleAddress = await tokenOracle.getAddress();

        await wrapEth.deposit({ value: parseEther('1') } as any)
        await wrapEth.transfer(testUniswapAddress as any, parseEther('1') as any)

        const minEntryPointBalance = 1e17.toString()
        const priceDenominator = ethers.parseUnits('1', 26)

        const tokenPaymasterConfig: TokenPaymaster.TokenPaymasterConfigStruct = {
            priceMaxAge: 86400,
            refundPostopCost: 40000,
            minEntryPointBalance,
            priceMarkup: priceDenominator * 15n / 10n, // +50%
        }


        const oracleHelperConfig: OracleHelper.OracleHelperConfigStruct = {
            cacheTimeToLive: 0,
            nativeOracle: nativeAssetOracleAddress,
            nativeOracleReverse: false,
            priceUpdateThreshold: 200_000, // +20%
            tokenOracle: tokenOracleAddress,
            tokenOracleReverse: false,
            tokenToNativeOracle: false
        }

        const uniswapHelperConfig: UniswapHelper.UniswapHelperConfigStruct = {
            minSwapAmount: 1,
            slippage: 5,
            uniswapPoolFee: 3
        }

        const TokenPaymaster = await ethers.getContractFactory("TokenPaymaster");
        const paymaster = await TokenPaymaster.deploy(
            bmTokenAddress,
            entryPointAddress,
            wrapEthAddress,
            testUniswapAddress,
            tokenPaymasterConfig,
            oracleHelperConfig,
            uniswapHelperConfig,
            admin.address
        );
        await paymaster.waitForDeployment();
        const paymasterAddress = await paymaster.getAddress();

        await bmToken.transfer(paymasterAddress as any, '100' as any)
        await paymaster.updateCachedPrice(true as any)
        await entryPoint.depositTo(paymasterAddress as any, { value: parseEther('1000') } as any)
        await paymaster.addStake(1 as any, { value: parseEther('2') } as any)

        const smartWalletAddress1 = await bicAccountFactory.getFunction("getAddress")(user1.address as any, "0x" as any);
        await bmToken.mint(smartWalletAddress1 as any, ethers.parseEther("1000") as any);
        expect(await bmToken.balanceOf(smartWalletAddress1 as any)).equal(ethers.parseEther("1000"));
        await createAndApproveBmToken(smartWalletAddress1, paymasterAddress);

        const initCallData = bmToken.interface.encodeFunctionData("transfer", [user2.address as any, ethers.parseEther("100") as any]);

        const transferOp = await createOp(smartWalletAddress1, "0x", initCallData, paymasterAddress);

        const ethAdminBalanceBefore = await provider.getBalance(admin.address);
        console.log('ethAdminBalanceBefore: ', ethAdminBalanceBefore.toString())
        console.log('ethDepositPaymasterBalanceBefore: ', await entryPoint.getDepositInfo(paymasterAddress as any))

        await entryPoint.connect(admin).handleOps([transferOp] as any, beneficiary as any);

        const ethAdminBalanceAfter = await provider.getBalance(admin.address);
        console.log('ethAdminBalanceAfter: ', ethAdminBalanceAfter.toString())
        console.log('ethDepositPaymasterBalanceAfter: ', await entryPoint.getDepositInfo(paymasterAddress as any))

        console.log('beneficiary eth after: ', await provider.getBalance(beneficiary))
        expect(await bmToken.balanceOf(user2.address as any)).equal(ethers.parseEther("100"));
    });

    it("should transfer bm token to user 2 and auto refill deposit (using token paymaster)", async () => {
        const WrapEth = await ethers.getContractFactory("WrapEth");
        const wrapEth = await WrapEth.deploy();
        await wrapEth.waitForDeployment();
        const wrapEthAddress = await wrapEth.getAddress();

        const TestUniswap = await ethers.getContractFactory("TestUniswap");
        const testUniswap = await TestUniswap.deploy(wrapEthAddress);
        await testUniswap.waitForDeployment();
        const testUniswapAddress = await testUniswap.getAddress();

        const initialPriceToken = 100000000 // USD per BM
        const initialPriceEther = 500000000 // USD per ETH

        const TestOracle2 = await ethers.getContractFactory("TestOracle2");
        const nativeAssetOracle = await TestOracle2.deploy(initialPriceEther, 8);
        await nativeAssetOracle.waitForDeployment();
        const nativeAssetOracleAddress = await nativeAssetOracle.getAddress();

        const tokenOracle = await TestOracle2.deploy(initialPriceToken, 8);
        await tokenOracle.waitForDeployment();
        const tokenOracleAddress = await tokenOracle.getAddress();

        await wrapEth.deposit({ value: parseEther('2') } as any)
        await wrapEth.transfer(testUniswapAddress as any, parseEther('2') as any)

        const minEntryPointBalance = 1e17.toString()
        const priceDenominator = ethers.parseUnits('1', 26)

        const tokenPaymasterConfig: TokenPaymaster.TokenPaymasterConfigStruct = {
            priceMaxAge: 86400,
            refundPostopCost: 40000,
            minEntryPointBalance,
            priceMarkup: priceDenominator * 15n / 10n, // +50%
        }

        const oracleHelperConfig: OracleHelper.OracleHelperConfigStruct = {
            cacheTimeToLive: 0,
            nativeOracle: nativeAssetOracleAddress,
            nativeOracleReverse: false,
            priceUpdateThreshold: 200_000, // +20%
            tokenOracle: tokenOracleAddress,
            tokenOracleReverse: false,
            tokenToNativeOracle: false
        }

        const uniswapHelperConfig: UniswapHelper.UniswapHelperConfigStruct = {
            minSwapAmount: 1,
            slippage: 5,
            uniswapPoolFee: 3
        }

        const TokenPaymaster = await ethers.getContractFactory("TokenPaymaster");
        const paymaster = await TokenPaymaster.deploy(
            bmTokenAddress,
            entryPointAddress,
            wrapEthAddress,
            testUniswapAddress,
            tokenPaymasterConfig,
            oracleHelperConfig,
            uniswapHelperConfig,
            admin.address
        );
        await paymaster.waitForDeployment();
        const paymasterAddress = await paymaster.getAddress();

        // await bmToken.transfer(paymasterAddress as any, '100' as any)
        await paymaster.updateCachedPrice(true as any)
        await entryPoint.depositTo(paymasterAddress as any, { value: parseEther('0.1') } as any)
        // await paymaster.addStake(1 as any, { value: parseEther('2') } as any)

        const smartWalletAddress1 = await bicAccountFactory.getFunction("getAddress")(user1.address as any, "0x" as any);
        await bmToken.mint(smartWalletAddress1 as any, ethers.parseEther("1000") as any);
        expect(await bmToken.balanceOf(smartWalletAddress1 as any)).equal(ethers.parseEther("1000"));
        await createAndApproveBmToken(smartWalletAddress1, paymasterAddress);

        const initCallData = bmToken.interface.encodeFunctionData("transfer", [user2.address as any, ethers.parseEther("100") as any]);

        const transferOp = await createOp(smartWalletAddress1, "0x", initCallData, paymasterAddress);

        const ethAdminBalanceBefore = await provider.getBalance(admin.address);
        console.log('ethAdminBalanceBefore: ', ethAdminBalanceBefore.toString())
        console.log('ethDepositPaymasterBalanceBefore: ', await entryPoint.getDepositInfo(paymasterAddress as any))

        console.log('paymasterAddress: ', paymasterAddress);
        console.log('smartWalletAddress1: ', smartWalletAddress1)
        await entryPoint.connect(admin).handleOps([transferOp] as any, beneficiary as any);

        const ethAdminBalanceAfter = await provider.getBalance(admin.address);
        console.log('ethAdminBalanceAfter: ', ethAdminBalanceAfter.toString())
        console.log('ethDepositPaymasterBalanceAfter: ', await entryPoint.getDepositInfo(paymasterAddress as any))

        console.log('beneficiary eth after: ', await provider.getBalance(beneficiary))
        expect(await bmToken.balanceOf(user2.address as any)).equal(ethers.parseEther("100"));
    });

    it('should update price when cached price is out dated (using token paymaster)', async () => {
        const WrapEth = await ethers.getContractFactory("WrapEth");
        const wrapEth = await WrapEth.deploy();
        await wrapEth.waitForDeployment();
        const wrapEthAddress = await wrapEth.getAddress();

        const TestUniswap = await ethers.getContractFactory("TestUniswap");
        const testUniswap = await TestUniswap.deploy(wrapEthAddress);
        await testUniswap.waitForDeployment();
        const testUniswapAddress = await testUniswap.getAddress();
        const TestOracle2 = await ethers.getContractFactory("TestOracle2");
        const tokenToNativeOracle = await TestOracle2.deploy(ethers.parseUnits("2", 1), 10);

        const initialPriceToken = 100000000 // USD per BM
        const initialPriceEther = 500000000 // USD per ETH

        const nativeAssetOracle = await TestOracle2.deploy(initialPriceEther, 8);
        await nativeAssetOracle.waitForDeployment();
        const nativeAssetOracleAddress = await nativeAssetOracle.getAddress();

        await tokenToNativeOracle.waitForDeployment();
        const tokenToNativeOracleAddress = await tokenToNativeOracle.getAddress();

        await wrapEth.deposit({ value: parseEther('2') } as any)
        await wrapEth.transfer(testUniswapAddress as any, parseEther('2') as any)

        const minEntryPointBalance = 1e17.toString()
        const priceDenominator = ethers.parseUnits('1', 26)

        const tokenPaymasterConfig: TokenPaymaster.TokenPaymasterConfigStruct = {
            priceMaxAge: 86400,
            refundPostopCost: 40000,
            minEntryPointBalance,
            priceMarkup: priceDenominator * 15n / 10n, // +50%
        }

        const oracleHelperConfig: OracleHelper.OracleHelperConfigStruct = {
            cacheTimeToLive: 0,
            nativeOracle: nativeAssetOracleAddress,
            nativeOracleReverse: false,
            priceUpdateThreshold: 200_000, // +20%
            tokenOracle: tokenToNativeOracleAddress,
            tokenOracleReverse: false,
            tokenToNativeOracle: true
        }
        const uniswapHelperConfig: UniswapHelper.UniswapHelperConfigStruct = {
            minSwapAmount: 1,
            slippage: 5,
            uniswapPoolFee: 3
        }

        const TokenPaymaster = await ethers.getContractFactory("TokenPaymaster");
        const paymaster = await TokenPaymaster.deploy(
            bmTokenAddress,
            entryPointAddress,
            wrapEthAddress,
            testUniswapAddress,
            tokenPaymasterConfig,
            oracleHelperConfig,
            uniswapHelperConfig,
            admin.address
        );
        await paymaster.waitForDeployment();
        const paymasterAddress = await paymaster.getAddress();

        // await bmToken.transfer(paymasterAddress as any, '100' as any)
        await paymaster.updateCachedPrice(true as any)
        await entryPoint.depositTo(paymasterAddress as any, { value: parseEther('0.1') } as any)

        expect(await paymaster.cachedPrice()).equal(ethers.parseUnits("2", 25)) //0.2 ETH per BM

        await tokenToNativeOracle.setPrice(ethers.parseUnits("1", 1) as any)
        await paymaster.updateCachedPrice(false as any)
        expect(await paymaster.cachedPrice()).equal(ethers.parseUnits("1", 25)) //0.1 ETH per BM
    });

});
// 0xaf3a4e3b3bfa7d75013b7526bec489b9832d2eb3061dcbd5467a4f3620d493185fe1809b7a7ff5a7d1b053e2a0bb4347fa284283e23621407ec64cc0c71a83681b
// 0xf261dd9c7d3dcbabdc9b3b2c6a4991724dbc524f92adfe8e1ee76597d0e0f344649c5a089c6cb0bc80af740e87304eeffad59fd5114cde9cda2c9a5abd74e2cd1b
