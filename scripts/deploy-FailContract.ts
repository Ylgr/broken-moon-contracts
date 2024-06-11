import {ethers, run } from "hardhat";

async function main() {
    console.log(`Deploy FailContract`);
    const FailContract = await ethers.getContractFactory("FailContract");
    console.log(`Get success FailContract`);

    const failContract = await FailContract.deploy();
    console.log(`Deploy success FailContract`);
    await failContract.waitForDeployment();
    const failContractAddress = await failContract.getAddress();

    console.log(`Deploy success FailContract on ${failContractAddress}`);
    try {
        console.log(`Verify FailContract on ${failContractAddress}`);
        await run(`verify:verify`, {
            address: failContractAddress,
            constructorArguments: [],
        });
        console.log(`Verify success FailContract on ${failContractAddress}`);
    } catch (e) {
        console.log(`Verify fail FailContract on ${failContractAddress} with error ${e}`);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
