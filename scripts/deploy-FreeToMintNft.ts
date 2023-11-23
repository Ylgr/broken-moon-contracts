import {ethers, run } from "hardhat";

async function main() {
    console.log(`Deploy FreeToMintNft`);
    const FreeToMintNft = await ethers.getContractFactory("FreeToMintNft");
    console.log(`Get success FreeToMintNft`);

    const freeToMintNft = await FreeToMintNft.deploy();
    console.log(`Deploy success FreeToMintNft`);
    await freeToMintNft.waitForDeployment();
    const freeToMintNftAddress = await freeToMintNft.getAddress();

    console.log(`Deploy success FreeToMintNft on ${freeToMintNftAddress}`);
    try {
        console.log(`Verify FreeToMintNft on ${freeToMintNftAddress}`);
        await run(`verify:verify`, {
            address: freeToMintNftAddress,
            constructorArguments: [],
        });
        console.log(`Verify success FreeToMintNft on ${freeToMintNftAddress}`);
    } catch (e) {
        console.log(`Verify fail FreeToMintNft on ${freeToMintNftAddress} with error ${e}`);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
