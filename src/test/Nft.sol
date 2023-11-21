// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract Nft is ERC721 {
    constructor() ERC721("Nft", "NFT") {
        _mint(msg.sender, 0);
    }

    function mint(address to, uint256 tokenId) public {
        _mint(to, tokenId);
    }
}
