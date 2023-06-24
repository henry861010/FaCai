# FaCai
## Idea: 
Currently, there are many web3 applications for lottery systems in the market, which ensure fair drawing processes through the transparent nature of blockchain. However, these applications lack mechanisms to protect the information of the winners. Therefore, based on Zero-Knowledge Proofs (ZKP), we have developed a lottery system called "Secure Lotto," which ensures the confidentiality of winner information while preventing cheating.

## How to play:
1. Visit our contract website and use `buy` with private_key_1 to input two random numbers along with the corresponding game fee.  
2. After the draw, the ticket owner can use private_key_2 with `redeem` to claim the prize by inputting the two random numbers used during the ticket purchase.

NOTE: If private_key_1 and private_key_2 belong to the same address, the confidentiality aspect will not be achieved.   
NOTE: It is essential to record the two sets of random numbers used during the "buy" process; otherwise, redemption will not be possible.

## Principle of ZKP:  
1. When using "buy," offline, the two sets of random numbers are hashed into commitments, which serve as input values for the Ethereum contract. The contract maintains a Merkle tree that records each input commitment, and the client's leaf is inserted into the tree after purchasing the lottery ticket.
2. When using "redeem"  
    * 1.[Offline]Generating a ZKP proof using snarkjs and a pre-defined circom circuit to prove that the redeemer knew the two sets of random numbers that resulted in the commitment.  
    * 2.[Offline]The redeemer calculates the corresponding Merkle root based on the Merkle tree from the previous ticket purchase to prove that the commitment was submitted before.
    * 3.[Offline]Hashing the first random number to check if the ticket has been used before.  
On the blockchain, the following steps are performed:  
    * 1.[Online]The contract verifies the presence of the corresponding Merkle root and checks if the ticket has been used.  
    * 2.[Online]If both conditions are met, the lottery mechanism is triggered.

## Reference:
* https://hackernoon.com/javascript-tutorial-for-zero-knowledge-proofs-using-snarkjs-and-circom/
* https://medium.com/swf-lab/circom-snarkjs-728e4314e057
* [https://www.epochconverter.com/](https://github.com/tornadocash/tornado-core/tree/master)https://github.com/tornadocash/tornado-core/tree/master
