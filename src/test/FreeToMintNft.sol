// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ERC721A.sol";


contract FreeToMintNft is ERC721A {
    constructor() ERC721A("Free to mint NFT", "F2M-NFT") {
        _safeMint(msg.sender, 1);
    }

    string public baseExtension = ".json";

    function _baseURI() internal view virtual override returns (string memory) {
        return "https://raw.githubusercontent.com/Ylgr/seadrop/dicebear_uri/uri/";
    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        return string(abi.encodePacked(ERC721A.tokenURI(tokenId), baseExtension));
    }

    function mint(address to, uint256 quantity) public {
        _safeMint(to, quantity);
    }
}
