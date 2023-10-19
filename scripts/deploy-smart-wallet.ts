import {ethers, run } from "hardhat";

async function main() {
    const EntryPoint = await ethers.getContractFactory("EntryPoint");
    const entryPoint = await EntryPoint.deploy();
    await entryPoint.waitForDeployment();
    const entryPointAddress = await entryPoint.getAddress();

    console.log(`Deploy success EntryPoint on ${entryPointAddress}`);
    try {
        console.log(`Verify EntryPoint on ${entryPointAddress}`);
        await run(`verify:verify`, {
            address: entryPointAddress,
            constructorArguments: [],
        });
        console.log(`Verify success EntryPoint on ${entryPointAddress}`);
    } catch (e) {
        console.log(`Verify fail EntryPoint on ${entryPointAddress} with error ${e}`);
    }

    const BicAccountFactory = await ethers.getContractFactory("BicAccountFactory");
    const bicAccountFactory = await BicAccountFactory.deploy(entryPointAddress);
    await bicAccountFactory.waitForDeployment();
    const bicAccountFactoryAddress = await bicAccountFactory.getAddress();

    console.log(`Deploy success BicAccountFactory on ${bicAccountFactoryAddress}`);
    try {
        console.log(`Verify BicAccountFactory on ${bicAccountFactoryAddress}`);
        await run(`verify:verify`, {
            address: bicAccountFactoryAddress,
            constructorArguments: [entryPointAddress],
        });
        console.log(`Verify success BicAccountFactory on ${bicAccountFactoryAddress}`);
    } catch (e) {
        console.log(`Verify fail BicAccountFactory on ${bicAccountFactoryAddress} with error ${e}`);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
