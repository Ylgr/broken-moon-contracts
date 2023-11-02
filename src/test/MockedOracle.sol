// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

import "../smart-wallet/interface/IOracle.sol";

contract MockedOracle is IOracle{
    function getTokenValueOfEth(uint256 ethOutput) external view returns (uint256 tokenInput) {
        // return 1 token = 0.0001 eth
        return ethOutput / 10000;
    }
}
