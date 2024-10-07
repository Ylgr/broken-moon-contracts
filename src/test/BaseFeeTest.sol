// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract BaseFeeTest {

    error ExecutionResult(uint256 basefee);

    function test() external returns (uint256) {
        return block.basefee;
    }

    function testRevert() external {
        revert ExecutionResult(block.basefee);
    }
}
