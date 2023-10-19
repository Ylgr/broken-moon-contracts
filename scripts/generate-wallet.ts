import {Wallet} from "ethers";
import fs from "fs";

const args = process.argv.slice(2);
const password = args[0];
if(!password) throw new Error("password is required");

async function main() {
    const randomWallet = Wallet.createRandom();
    const walletAddress = randomWallet.address;
    const encryptedWallet = await randomWallet.encrypt(password);
    const encryptedWalletJson = JSON.stringify({
        name: password,
        encryptedWallet: encryptedWallet
    });
    fs.writeFileSync('./accounts/' + password + '.json', encryptedWalletJson);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
