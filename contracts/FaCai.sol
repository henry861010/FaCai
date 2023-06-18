//SPDX-License-Identifier: UNLICENSED

// Solidity files have to start with this pragma.
// It will be used by the Solidity compiler to validate its version.
pragma solidity ^0.8.9;

import "./merkletree.sol";
import "./random.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface IVerifier {   //used to verofy the ZKP proof
    function verifyProof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[1] memory input
    ) external view returns (bool r);
}


//random function - getRandom
contract FaCai is MerkleTree, ReentrancyGuard, random {
    mapping(bytes32 => bool) public nullifierHashes;
    mapping(bytes32 => bool) public commitments;
    mapping(uint => uint) public everyonePrize;
    mapping(bytes32 => bool) public isDeterminePrize;  
    mapping(bytes32 => uint) public nullifierHashToPrize;           //nullifierHashToPrize[_nullifierHash] = prize2;
    mapping(uint => bytes32) public prizeToNullifierHash;       	//prizeToNullifierHash[prize2] = _nullifierHash;
    uint prize1;
    uint prize2;
    uint prize3;
    uint numberOfBuyer;
    uint totalPrize;
    uint ticketPrice;
    uint256 timeEnd;
    uint256 timeBegin;
    IVerifier verifier;
    bool ifprize1 = false;
    bool ifprize2 = false;
    bool ifprize3 = false;



    event BuyLottery(bytes32 indexed commitments, uint32 leafIndex, uint256 timestamp);
    event Redeem(address to, bytes32 nullifierHashes, uint prize);

    constructor(
        address _verifier,
        uint32 _merkleTreeHieght,
        uint256 _timeEnd,
        uint _prize1,
        uint _prize2,
        uint _prize3,
        uint _tickerPrice
    ) MerkleTree(_merkleTreeHieght) {
        verifier = IVerifier(_verifier);
        timeEnd = _timeEnd;
        timeBegin = block.timestamp;
        prize1 = _prize1;
        prize2 = _prize2;
        prize3 = _prize3;
        ticketPrice = _tickerPrice;
    }
    
    

    function getGameInfo() external view returns(uint, uint, uint, uint256, uint256, uint256, address, uint){
        return (prize1, prize2, prize3, timeEnd, totalPrize, ticketPrice, address(this), numberOfBuyer);
    }

    function buyLottery(bytes32 _commitment) public payable nonReentrant{
        require(block.timestamp < timeEnd,"over-time");  //開獎前才可以買彩票
        require(msg.value > ticketPrice ,"the lottery ticky is 1 ethers");

        uint32 insertedIndex = _insert(_commitment);
        commitments[_commitment] = true;
        numberOfBuyer++;
        totalPrize = totalPrize + ticketPrice;

        emit BuyLottery(_commitment, insertedIndex, block.timestamp);
    }

    function redeem(
        bytes32 _root,          //用於確認曾經有買票
        bytes32 _nullifierHash  //用於卻沒有重複使用
    ) external returns(uint){
        require(block.timestamp > timeEnd,"the lottery is not end");
        require(!nullifierHashes[_nullifierHash], "The note has been already spent");
        require(isKnownRoot(_root), "Cannot find your merkle root");
        require(verifier.verifyProof(a, b, c, input), "Invalid withdraw proof");
    

        nullifierHashes[_nullifierHash] = true;

        //send ether of "prize" ethers
        uint prize = checkBuyerPrize(_nullifierHash);  
        if(prize>0){
            payable(msg.sender).transfer(prize);  //send the prize to the winner
        }
        emit Redeem(msg.sender, _nullifierHash, prize);
        return prize;
    }

    function checkBuyerPrize(bytes32 _nullifierHash) public returns(uint){  //chech if determine the prize, if not deteemine and return prize
        if(!isDeterminePrize[_nullifierHash]){
            isDeterminePrize[_nullifierHash] = true;
            _determinePrize(_nullifierHash);
        }
        return nullifierHashToPrize[_nullifierHash];
    }


    function _determinePrize(bytes32 _nullifierHash) private returns(uint){  //determine the prize
        uint randomNumber;
        uint temp;
        bool determine = false;
        randomNumber = getRandom();
        temp = randomNumber%numberOfBuyer;  //get the random number and % total number of player
        if(temp==0){
           if(!ifprize1){  //equal to 0 and no one win this prize, then it get the this prize
                nullifierHashToPrize[_nullifierHash] = prize1;
                determine = true;
                ifprize1 = true;
            }
            else{  //equal to 0 but there is someone wonthis prize, then it get nothing
                nullifierHashToPrize[_nullifierHash] = 0;
                determine = true;            
            }
         }
        else if(temp==1){
            if(!ifprize2){  //equal to 1 and no one win this prize, then it get the this prize
                nullifierHashToPrize[_nullifierHash] = prize2;
                determine = true;
                ifprize2 = true;    
            }else{  //equal to 1 but there is someone wonthis prize, then it get nothing
                nullifierHashToPrize[_nullifierHash] = 0;
                determine = true;                 
            }       
        }
        else if(temp==2){
            if(!ifprize3){  //equal to 2 and no one win this prize, then it get the this prize
                nullifierHashToPrize[_nullifierHash] = prize3;
                determine = true;
                ifprize3 = true;  
             }else{  //equal to 2 but there is someone wonthis prize, then it get nothing
                nullifierHashToPrize[_nullifierHash] = 0;
                determine = true;                 
             }   
        }
        else{  //get nothing
             nullifierHashToPrize[_nullifierHash] = 0;
             determine = true;
        }
        return nullifierHashToPrize[_nullifierHash];
    }

}
