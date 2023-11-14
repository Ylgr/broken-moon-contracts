import {ethers, run } from "hardhat";

async function main() {
    const MockOracle = await ethers.getContractFactory("MockOracle");
    const mockOracle = await MockOracle.deploy();
    await mockOracle.waitForDeployment();
    const mockOracleAddress = await mockOracle.getAddress();

    const entryPointAddress = '0x0Dea81090663911A57f1cEc9569e55FD852E5dD3';
    const DepositPaymaster = await ethers.getContractFactory("DepositPaymaster");
    const depositPaymaster = await DepositPaymaster.deploy(entryPointAddress);
    await depositPaymaster.waitForDeployment();
    const depositPaymasterAddress = await depositPaymaster.getAddress();

    console.log(`Deploy success DepositPaymaster on ${depositPaymasterAddress}`);
    try {
        console.log(`Verify DepositPaymaster on ${depositPaymasterAddress}`);
        await run(`verify:verify`, {
            address: depositPaymasterAddress,
            constructorArguments: [entryPointAddress],
        });
        console.log(`Verify success DepositPaymaster on ${depositPaymasterAddress}`);
    } catch (e) {
        console.log(`Verify fail DepositPaymaster on ${depositPaymasterAddress} with error ${e}`);
    }

    await depositPaymaster.addToken('0x79942a7E73b3E27038D896E16157ECaac819d3AF' as any, mockOracleAddress as any);
    await depositPaymaster.deposit({value: ethers.parseEther("0.1")} as any);

}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
