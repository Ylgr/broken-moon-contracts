// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interface/IERC20Burnable.sol";

contract Treasury is Ownable, ReentrancyGuard {
    bytes32 public merkleRoot;
    mapping(uint256 => uint256) private claimedBitMap;

    event Claimed(uint256 index,  address token, address account, uint256 amount);

    function submitMerkleRoot(bytes32 merkleRoot_) external onlyOwner {
        require(merkleRoot_ != 0, "Treasury: Invalid merkle root");
        require(merkleRoot_ != merkleRoot, "Treasury: Merkle root already submitted");

        merkleRoot = merkleRoot_;
    }

    function isClaimed(uint256 index) public view returns (bool) {
        uint256 claimedWordIndex = index / 256;
        uint256 claimedBitIndex = index % 256;
        uint256 claimedWord = claimedBitMap[claimedWordIndex];
        uint256 mask = (1 << claimedBitIndex);
        return claimedWord & mask == mask;
    }

    function _setClaimed(uint256 index) private {
        uint256 claimedWordIndex = index / 256;
        uint256 claimedBitIndex = index % 256;
        claimedBitMap[claimedWordIndex] = claimedBitMap[claimedWordIndex] | (1 << claimedBitIndex);
    }

    function claim(
        uint256 index,
        address token,
        address account,
        uint256 amount,
        bytes32[] calldata merkleProof
    ) external nonReentrant {
        require(!isClaimed(index), "Treasury: Drop already claimed.");

        // Verify the merkle proof.
        bytes32 node = keccak256(abi.encodePacked(index, token, account, amount));
        require(MerkleProof.verify(merkleProof, merkleRoot, node), "Treasury: Invalid proof.");

        // Mark it claimed and send the token.
        _setClaimed(index);
        if(account == address(0)) {
            IERC20Burnable(token).burn(amount);
        } else {
            require(IERC20Burnable(token).transfer(account, amount), "Treasury: Transfer failed.");
        }

        emit Claimed(index, token, account, amount);
    }

    function setApproveToken(address token, address spender, uint256 amount) external onlyOwner {
        require(IERC20Burnable(token).approve(spender, amount), "Treasury: Approve failed.");
    }


}
