// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

// Utils
import "./utils/BaseAccountFactory.sol";
import "./utils/BaseAccount.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";

// Extensions
import "./extension/upgradeable/PermissionsEnumerable.sol";
import "./extension/upgradeable/ContractMetadata.sol";

// Interface
import "./interface/IEntrypoint.sol";

// Smart wallet implementation
import { BicAccount } from "./BicAccount.sol";

//   $$\     $$\       $$\                 $$\                         $$\
//   $$ |    $$ |      \__|                $$ |                        $$ |
// $$$$$$\   $$$$$$$\  $$\  $$$$$$\   $$$$$$$ |$$\  $$\  $$\  $$$$$$\  $$$$$$$\
// \_$$  _|  $$  __$$\ $$ |$$  __$$\ $$  __$$ |$$ | $$ | $$ |$$  __$$\ $$  __$$\
//   $$ |    $$ |  $$ |$$ |$$ |  \__|$$ /  $$ |$$ | $$ | $$ |$$$$$$$$ |$$ |  $$ |
//   $$ |$$\ $$ |  $$ |$$ |$$ |      $$ |  $$ |$$ | $$ | $$ |$$   ____|$$ |  $$ |
//   \$$$$  |$$ |  $$ |$$ |$$ |      \$$$$$$$ |\$$$$$\$$$$  |\$$$$$$$\ $$$$$$$  |
//    \____/ \__|  \__|\__|\__|       \_______| \_____\____/  \_______|\_______/

contract BicAccountFactory is BaseAccountFactory, ContractMetadata, PermissionsEnumerable {
    // recovery address using to change admin address if needed
    address public recoveryAddress;

    /*///////////////////////////////////////////////////////////////
                            Constructor
    //////////////////////////////////////////////////////////////*/

    constructor(IEntryPoint _entrypoint)
        BaseAccountFactory(address(new BicAccount(_entrypoint, address(this))), address(_entrypoint))
    {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        recoveryAddress = _msgSender();
    }

    /*///////////////////////////////////////////////////////////////
                        Internal functions
    //////////////////////////////////////////////////////////////*/

    /// @dev Called in `createAccount`. Initializes the account contract created in `createAccount`.
    function _initializeAccount(
        address _account,
        address _admin,
        bytes calldata _data
    ) internal override {
        BicAccount(payable(_account)).initialize(_admin, _data);
    }

    /// @dev Returns whether contract metadata can be set in the given execution context.
    function _canSetContractURI() internal view virtual override returns (bool) {
        return hasRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function changeRecoveryAddress(address _recoveryAddress) public {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "BicAccountFactory: changeRecoveryAddress: only admin can change recovery address");
        recoveryAddress = _recoveryAddress;
    }
}
