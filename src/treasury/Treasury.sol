// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./interface/IERC20Burnable.sol";

contract Treasury is Ownable, ReentrancyGuard {
    struct PrimeInfo {
        IERC721 token;
        uint256 tokenId;
    }

    event PrimeAdded(IERC721 token, uint256 tokenId);

    event PrimeRemoved(IERC721 token, uint256 tokenId);

    event ExecuteTreasuryLogic(address token, uint256 burnAmount, uint256 airDropAmount);

    event ReceiveAirDropPrime(address token, uint256 tokenId, address to, uint256 amount);

    PrimeInfo[] public primes;

    uint8 public burnPercentage;

    function addPrime(IERC721 token, uint256 tokenId) external onlyOwner {
        primes.push(PrimeInfo(token, tokenId));
        emit PrimeAdded(token, tokenId);
    }

    function removePrime(uint256 index) external onlyOwner {
        require(index < primes.length, "Treasury: index out of bounds");
        for (uint256 i = index; i < primes.length - 1; i++) {
            primes[i] = primes[i + 1];
        }
        primes.pop();
emit PrimeRemoved(primes[index].token, primes[index].tokenId);
    }

    function setBurnPercentage(uint8 _burnPercentage) external onlyOwner {
        require(_burnPercentage <= 100, "Treasury: burn percentage must be less than or equal to 100");
        burnPercentage = _burnPercentage;
    }

    function withdraw(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) {
            payable(owner()).transfer(amount);
        } else {
            IERC20(token).transfer(owner(), amount);
        }
    }

    function withdrawNFT(address token, uint256 tokenId) external onlyOwner {
        IERC721(token).transferFrom(address(this), owner(), tokenId);
    }

    function execute(address token) external nonReentrant {
        uint256 burnAmount = IERC20Burnable(token).balanceOf(address(this)) * burnPercentage / 100;
        IERC20Burnable(token).burn(burnAmount);
        if(primes.length == 0) {
            return;
        }
        uint256 airDropAmount = IERC20Burnable(token).balanceOf(address(this))/primes.length;
        for (uint256 i = 0; i < primes.length; i++) {
            IERC20Burnable(token).transfer(primes[i].token.ownerOf(primes[i].tokenId), airDropAmount);
            emit ReceiveAirDropPrime(address(primes[i].token), primes[i].tokenId, primes[i].token.ownerOf(primes[i].tokenId), airDropAmount);
        }
        emit ExecuteTreasuryLogic(token, burnAmount, airDropAmount);
    }
}
