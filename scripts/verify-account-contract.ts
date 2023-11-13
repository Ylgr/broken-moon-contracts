import {ethers, run} from "hardhat";

async function main() {
    const accountAddress = "0xA3834Fd8854BF49B0B20289cD4765b4aE1d891ae";
    try {
        console.log(`Verify BicAccount on ${accountAddress}`);
        await run(`verify:verify`, {
            address: accountAddress,
            constructorArguments: ["0x0Dea81090663911A57f1cEc9569e55FD852E5dD3", "0x0e5476a5AfD15c1e35ca4d97D220cb9f40617609"],
        });
        console.log(`Verify success BicAccount on ${accountAddress}`);
    } catch (e) {
        console.log(`Verify fail BicAccount on ${accountAddress} with error ${e}`);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
