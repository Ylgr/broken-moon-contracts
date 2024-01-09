// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract WrapEth is ERC20 {
    constructor() ERC20("Wrap Ethereum", "wETH") {
    }

    receive() external payable {
        deposit();
    }

    function deposit() public payable {
        _mint(msg.sender, msg.value);
    }

    function withdraw(uint amount) public {
        _burn(msg.sender, amount);
        // solhint-disable-next-line avoid-low-level-calls
        (bool success,) = msg.sender.call{value:amount}("");
        require(success, "transfer failed");
    }
}
