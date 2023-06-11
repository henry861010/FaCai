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

    event BuyLottery(bytes32 indexed commitments, uint32 leafIndex, uint256 timestamp);
    event Redeem(address to, bytes32 nullifierHashes);

    constructor(
        IVerifier _verifier,
        IHasher _hasher,
        uint32 _merkleTreeHieght,
        uint256 _timeEnd,
        uint _prize1,
        uint _prize2,
        uint _prize3,
        uint _tickerPrice
    ) MerkleTree(_merkleTreeHieght, _hasher) {
        verifier = _verifier;
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
        require(msg.value == ticketPrice ,"the lottery ticky is 1 ethers");

        uint32 insertedIndex = _insert(_commitment);
        commitments[_commitment] = true;
        numberOfBuyer++;
        totalPrize = totalPrize + ticketPrice;

        emit BuyLottery(_commitment, insertedIndex, block.timestamp);
    }

    function redeem(
        uint256[2] memory a,    //proof[1]
        uint256[2][2] memory b, //proof[2]
        uint256[2] memory c,    //proof[3]
        uint256[1] memory input,//proof[4]
        bytes32 _root,          //用於確認曾經有買票
        bytes32 _nullifierHash  //用於卻沒有重複使用
    ) external{
        require(block.timestamp > timeEnd,"the lottery is not end");
        require(!nullifierHashes[_nullifierHash], "The note has been already spent");
        require(isKnownRoot(_root), "Cannot find your merkle root");
        require(verifier.verifyProof(a, b, c, input), "Invalid withdraw proof");
    
        //be redeem
        nullifierHashes[_nullifierHash] = true;

        //send ether of "prize" ethers
        uint prize = checkBuyerPrize(_nullifierHash);  
        if(prize>0){
            payable(msg.sender).transfer(prize);  //send the prize to the winner
        }
        emit Redeem(msg.sender, _nullifierHash);
    }

    function checkBuyerPrize(bytes32 _nullifierHash) public returns(uint){
        if(!isDeterminePrize[_nullifierHash]){
            _determinePrize(_nullifierHash);
        }
        return nullifierHashToPrize[_nullifierHash];
    }


    function _determinePrize(bytes32 _nullifierHash) private returns(uint){
        uint randomNumber = getRandom();
        uint temp = randomNumber%numberOfBuyer;
        if(temp==0 && prizeToNullifierHash[0]==0){
            nullifierHashToPrize[_nullifierHash] = prize1;
            prizeToNullifierHash[prize1] = _nullifierHash;
        }
        else if(temp==1 && prizeToNullifierHash[1]==0){
            nullifierHashToPrize[_nullifierHash] = prize2;
            prizeToNullifierHash[prize2] = _nullifierHash;
        }
        else if(temp==2 && prizeToNullifierHash[2]==0){
            nullifierHashToPrize[_nullifierHash] = prize3;
            prizeToNullifierHash[prize3] = _nullifierHash;
        }
        else{
            nullifierHashToPrize[_nullifierHash] = 0;
        }
        return nullifierHashToPrize[_nullifierHash];
    }

}
