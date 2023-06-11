//SPDX-License-Identifier: UNLICENSED

// Solidity files have to start with this pragma.
// It will be used by the Solidity compiler to validate its version.
pragma solidity ^0.8.9;

contract random{

    uint randomNumber;
	
    constructor() {
        randomNumber = 1323422442; 
    }
    
    function getRandom() internal view returns(uint){
        return randomNumber;
    }
}
