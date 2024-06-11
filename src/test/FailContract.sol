// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract FailContract {
    function testCall(bool isSucess) public {
        require(isSucess, "FailContract: testCall failed");
    }

    function callRevert() public {
        revert("FailContract: callRevert failed");
    }

    function callAssert() public {
        assert(false);
    }
}
