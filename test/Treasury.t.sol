// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/treasury/Treasury.sol";
import "../src/test/BMToken.sol";
import "../src/test/Nft.sol";

contract TreasuryTest is Test {
    Treasury public treasury;
    BMToken public bmToken;
    Nft public nft;

    uint256 public user1PKey = 0x1;
    address public user1 = vm.addr(user1PKey);
    uint256 public user2PKey = 0x2;
    address public user2 = vm.addr(user2PKey);

    function setUp() public {
        bmToken = new BMToken();
        nft = new Nft();
        treasury = new Treasury();
        treasury.setBurnPercentage(50);

        bmToken.mint(address(treasury), 1000000000000000000000000000);
        nft.mint(user1, 1);
        treasury.addPrime(nft, 1);

        nft.mint(user2, 2);
        treasury.addPrime(nft, 2);

        nft.mint(user2, 3);
        treasury.addPrime(nft, 3);

        nft.mint(user2, 4);
        treasury.addPrime(nft, 4);

        nft.mint(user2, 5);
        treasury.addPrime(nft, 5);
    }

    function test_executeTreasuryLogic() public {
        assertEq(bmToken.balanceOf(address(treasury)), 1000000000000000000000000000);
        treasury.execute(address(bmToken));
        assertEq(bmToken.balanceOf(address(treasury)), 0);
        assertEq(bmToken.balanceOf(address(user1)), 100000000000000000000000000);
        assertEq(bmToken.balanceOf(address(user2)), 400000000000000000000000000);
    }
}
