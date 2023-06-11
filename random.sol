//SPDX-License-Identifier: UNLICENSED

// Solidity files have to start with this pragma.
// It will be used by the Solidity compiler to validate its version.
pragma solidity ^0.8.9;

contract random{

	uint random;
	
	constructor() {
        random = 1323422442
    }
    
    function getRandom() private view return(uint){
        return random;
    }
}