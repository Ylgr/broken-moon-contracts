// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
contract BMToken is ERC20Burnable {
    constructor() ERC20("BMToken", "BM") {
        _mint(msg.sender, 1000000000000000000000000000);
    }

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }

    function transferFrom(address sender, address recipient, uint256 amount) public override returns (bool) {
        return super.transferFrom(sender, recipient, amount);
    }
}
