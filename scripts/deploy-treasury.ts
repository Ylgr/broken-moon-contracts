import {ethers, run } from "hardhat";

async function main() {
    const Treasury = await ethers.getContractFactory("Treasury");
    const treasury = await Treasury.deploy();
    await treasury.waitForDeployment();
    const treasuryAddress = await treasury.getAddress();

    console.log(`Deploy success Treasury on ${treasuryAddress}`);
    try {
        console.log(`Verify Treasury on ${treasuryAddress}`);
        await run(`verify:verify`, {
            address: treasuryAddress,
            constructorArguments: [],
        });
        console.log(`Verify success Treasury on ${treasuryAddress}`);
    } catch (e) {
        console.log(`Verify fail Treasury on ${treasuryAddress} with error ${e}`);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
