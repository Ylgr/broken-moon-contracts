import {ethers} from "hardhat";

async function main() {
    const usdtAddress = "0x8B47463BC534aEaFB0BFe78325234Cfe52167E0d";
    const bicAddress = "0x4a654ED99fBB4f2Ae27A315b897f8A0979cf1853"
    const routerAddress = "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E";
    const pairAddress = "0x3d59fFD9928b730E47D3ec7f094f890E1F67f5B7";
    const permit2Address = "0x000000000022D473030F116dDEE9F6B43aC78BA3";

    const wallet1 = (await ethers.getSigners())[0];
    console.log('wallet1: ', wallet1.address);

    const usdtContract = await ethers.getContractAt("BMToken", usdtAddress, wallet1);
    const routerContract = await ethers.getContractAt("ISwapRouter", routerAddress, wallet1);
    console.log('usdt name:', await usdtContract.name());
    const path = [usdtAddress, bicAddress];
    const amountIn = ethers.parseEther("100");
    const amountOutMin = 0;
    const to = wallet1.address;
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
    console.log('swap parmas:', {
        tokenIn: usdtAddress,
        tokenOut: bicAddress,
        fee: 3000,
        recipient: to,
        // deadline: deadline,
        amountIn: amountIn,
        amountOutMinimum: amountOutMin,
        sqrtPriceLimitX96: 0
    });
    const tx = await routerContract.exactInputSingle({
        tokenIn: usdtAddress,
        tokenOut: bicAddress,
        fee: 3000,
        recipient: to,
        // deadline: deadline,
        amountIn: amountIn,
        amountOutMinimum: amountOutMin,
        sqrtPriceLimitX96: 0
    } as any);

    await tx.wait();
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
