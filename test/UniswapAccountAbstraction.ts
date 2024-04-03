import {ethers} from "hardhat";
import {expect} from "chai";


describe('UniswapAccountAbstraction', () => {
    const usdtAddress = "0x8B47463BC534aEaFB0BFe78325234Cfe52167E0d";
    const bicAddress = "0x4a654ED99fBB4f2Ae27A315b897f8A0979cf1853"
    const routerAddress = "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E";
    const pairAddress = "0x3d59fFD9928b730E47D3ec7f094f890E1F67f5B7";
    const permit2Address = "0x000000000022D473030F116dDEE9F6B43aC78BA3";

    beforeEach(async () => {
        console.log('do nothing');
    });

    it("should swap USDT to BIC in normal case", async () => {
        const wallet1 = (await ethers.getSigners())[0];
        const adminWallet = new ethers.Wallet("0x" + process.env.PRIVATE_KEY, ethers.provider);
        const usdtContract = await ethers.getContractAt("BMToken", usdtAddress, wallet1);
        expect(await usdtContract.name()).to.be.equal("Just a test of USDT"); // https://sepolia.etherscan.io/address/0x8B47463BC534aEaFB0BFe78325234Cfe52167E0d
        // mint 100 USDT to testWallet
        await usdtContract.connect(adminWallet).mintTo(wallet1.address as any, ethers.parseEther("100") as any);
        expect(await usdtContract.balanceOf(wallet1.address as any)).to.be.equal(ethers.parseEther("100"));
        const bicContract = await ethers.getContractAt("BMToken", bicAddress, wallet1);
        const routerContract = await ethers.getContractAt("ISwapRouter", routerAddress, wallet1);

        // approve USDT to router
        await usdtContract.connect(wallet1).approve(permit2Address as any, ethers.parseEther("100") as any);
        console.log("approve USDT to permit2Address success");
        // swap USDT to BIC
        const path = [usdtAddress, bicAddress];
        const amountIn = ethers.parseEther("100");
        const amountOutMin = 0;
        const to = wallet1.address;
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
        console.log('wallet1: ', wallet1.address);
        console.log('eth of wallet1: ', (await ethers.provider.getBalance(wallet1.address)).toString());
        const tx = await routerContract.connect(wallet1).exactInputSingle({
            tokenIn: usdtAddress,
            tokenOut: bicAddress,
            fee: 3000,
            recipient: to,
            // deadline: deadline, // not have deadline on this address
            amountIn: amountIn,
            amountOutMinimum: amountOutMin,
            sqrtPriceLimitX96: 0
        } as any);

        await tx.wait();
        const bicBalance = await bicContract.balanceOf(wallet1.address as any);
        console.log("bicBalance: ", ethers.formatEther(bicBalance));
    });

    // it("should swap USDT to BIC in aa case", async () => {
    // const testWallet = ethers.Wallet.createRandom();
    //     const adminWallet = new ethers.Wallet("0x" + process.env.PRIVATE_KEY, ethers.provider);
    //     const usdtContract = await ethers.getContractAt("BMToken", usdtAddress, testWallet);
    //     // mint 100 USDT to testWallet
    //     await usdtContract.connect(adminWallet).mintTo(testWallet.address as any, ethers.parseEther("100") as any);
    //     const bicContract = await ethers.getContractAt("BMToken", bicAddress, testWallet);
    // });
});
