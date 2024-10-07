import {ethers, run } from "hardhat";

async function main() {
    console.log(`Deploy BaseFeeTest`);
    const BaseFeeTest = await ethers.getContractFactory("BaseFeeTest");
    console.log(`Get success BaseFeeTest`);

    const baseFeeTest = await BaseFeeTest.deploy();
    console.log(`Deploy success BaseFeeTest`);
    await baseFeeTest.waitForDeployment();
    const baseFeeTestAddress = await baseFeeTest.getAddress();

    console.log(`Deploy success BaseFeeTest on ${baseFeeTestAddress}`);
    try {
        console.log(`Verify BaseFeeTest on ${baseFeeTestAddress}`);
        await run(`verify:verify`, {
            address: baseFeeTestAddress,
            constructorArguments: [],
        });
        console.log(`Verify success BaseFeeTest on ${baseFeeTestAddress}`);
    } catch (e) {
        console.log(`Verify fail BaseFeeTest on ${baseFeeTestAddress} with error ${e}`);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
