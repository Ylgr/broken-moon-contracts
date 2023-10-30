// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract BMToken is ERC20 {
    constructor() ERC20("BMToken", "BM") {
        _mint(msg.sender, 1000000000000000000000000000);
    }

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}
