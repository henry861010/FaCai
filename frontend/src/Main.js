import React, {useState} from "react";
import {ethers} from "ethers";
import contractAbi from "./contractAbi.json";
import Alert from 'react-bootstrap/Alert';
import ReactDOM from 'react-dom'
import './Main.css';

const Main = () => {
    const CONTRACT_ADDRESS = "0xe634fb68e2027872620b8962a5F41F556e16EDA4";
    const API_KEY = "0kZuKFtLQruoX7ynabC9KCPzrtKeT_25";
    const PRIVATE_KEY = "927c6574f995bddae6eaf81cc4b4a3a49b3d8f41b04664f8842d9c3bbaf98142";

    // let web3;
    const [participatePeople, setParticipatePeople] = useState(0);
    const [totalAward, setTotalAward] = useState(0);
    const [firstPrize, setFirstPrize] = useState(0);
    const [secondPrize, setSecondPrize] = useState(0);
    const [thirdPrize, setThirdPrize] = useState(0);
    const [lotteryPrice, setLotteryPrice] = useState(0);
    const [lotteryOpenTime, setLotteryOpenTime] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);
    const [defaultAccount, setDefaultAccount] = useState(null);
    const [connButtonText, setConnButtonText] = useState('Connect Wallet');
    const [DisconnButtonText, setDisconnButtonText] = useState('Disconnect Wallet');
    const [isVisibleDisconnBtn, setIsVisibleDisconnBtn] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const [buySecretPhrase1, setbuySecretPhrase1] = useState(null);
    const [buySecretPhrase2, setbuySecretPhrase2] = useState(null);

    const [showAlert, setShowAlert] = useState(false);
    const [showBuyAlert, setshowBuyAlert] = useState(false);
    const [prizeText, setPrizeText] = useState(null);
    const [successfulBuyText, setSuccessfulBuyText] = useState(null);

    const alchemyProvider = new ethers.providers.AlchemyProvider("goerli", API_KEY);
    const signer = new ethers.Wallet(PRIVATE_KEY, alchemyProvider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi, signer);

    const connectWalletHandler = () => {
        if (window.ethereum) {
            window.ethereum.request({ method: 'eth_requestAccounts' })
                .then(async (result) => {
                    setConnButtonText(result[0]);
                    setIsVisibleDisconnBtn(true);
                    accountChangedHandler(result[0]);
                });
        } else {
            setErrorMessage("Need to Install Metamask!");
        }
    };
  
    const disconnectWalletHandler = async () => {
        setConnButtonText("Connect Wallet");
        setIsVisibleDisconnBtn(false);
        setDefaultAccount(null);
    };

    const accountChangedHandler = (newAccount) => {
        setDefaultAccount(newAccount);
    };

    const refreshBtnHandler = async () => {
        if (contract) {
            try {
                setIsLoading(true);
                const hexToDecimal = hex => parseInt(hex, 16);
                let result = await contract.getGameInfo()
                let prize1 = hexToDecimal(result[0]._hex)
                let prize2 = hexToDecimal(result[1]._hex)
                let prize3 = hexToDecimal(result[2]._hex)
                let dueDate_timestamp = hexToDecimal(result[3]._hex)
                const date= new Date(dueDate_timestamp * 1000);
                const dateFormat = date.getHours() + ":" + date.getMinutes() + ", "+ date.toDateString();
                let totalPrize = hexToDecimal(result[4]._hex)
                let ticketPrice = hexToDecimal(result[5]._hex)
                let numberOfBuyer = hexToDecimal(result[7]._hex)

                setFirstPrize(prize1);
                setSecondPrize(prize2);
                setThirdPrize(prize3);
                setLotteryOpenTime(dateFormat);
                setTotalAward(totalPrize);
                setLotteryPrice(ticketPrice);
                setParticipatePeople(numberOfBuyer);

                console.log("Clicked Refresh Btn");
                setIsLoading(false);
            } catch (error) {
                console.error("Error fetching current root index:", error);
            }
        }
    };

    const createDeposit = async (nullifier, secret) => {
        let deposit = { nullifier, secret }
        deposit.commitment = nullifier
        deposit.nullifierHash = nullifier
        return deposit
    }

    const generateRandomHex = (length) => {
        const values = new Uint8Array(length / 2);
        crypto.getRandomValues(values);
        return '0x' + Array.from(values).map(byte => byte.toString(16).padStart(2, '0')).join('');
    };

    const buyBtnHandler = async () => {
        if (contract) {
            try {

                console.log("Buy Btn Clicked");
                const nullifier = generateRandomHex(64);
                const secret = generateRandomHex(64);
                const deposit = createDeposit(nullifier, secret);

                const tx = await contract.buyLottery(nullifier);

                setbuySecretPhrase1(nullifier);
                setbuySecretPhrase2(secret);

                setSuccessfulBuyText("Buy Sucessful !");
                setshowBuyAlert(true);

                return deposit;

            } catch (error) {
                console.error("Error buying lottery:", error);
                // Handle error
            }
        }
    };


    const redeemBtnHandler = async () => {
        if (contract) {
            try {
                console.log("Redeem Btn Clicked");
                const redeemSecretPhrase1 = document.getElementById("redeemScretPhrase1").value;
                const redeemSecretPhrase2 = document.getElementById("redeemScretPhrase2").value;
                const tx = await contract.redeem(redeemSecretPhrase1, redeemSecretPhrase1);
                const hexToDecimal = hex => parseInt(hex, 16);
                if(hexToDecimal(tx.value._hex) !== 0){
                    setPrizeText("You Got "+ hexToDecimal(tx.value._hex) +"E !");
                    setShowAlert(true);
                    // alert("You Got 1E !");
                }else{
                    setPrizeText("You got nothing :(");
                    setShowAlert(true);
                }


                // Handle successful transaction
            } catch (error) {
                console.error("Error redeeming lottery:", error);
                setPrizeText("Can not redeem twice");
                setShowAlert(true);
                // Handle error
            }
        }
    };


    return (
        <div className="container">


            <nav className="navbar navbar-expand-lg navbar-light bg-light banner">
                <div className="banner">
                    <button className="btn btn-outline-primary connect-button" onClick={connectWalletHandler}>{connButtonText}</button>
                    {isVisibleDisconnBtn && (
                        <button className="btn btn-outline-primary connect-button" onClick={disconnectWalletHandler}>
                            {DisconnButtonText}
                        </button>
                    )}
                </div>

            </nav>


            <div className="mainBlock">
                <div className="board" onLoad={refreshBtnHandler}>
                    <div className="Content">
                        <div className="alert alert-primary prize-info" role="alert">
                            Already Participated: {participatePeople}
                        </div>
                        <div className="alert alert-primary prize-info" role="alert">
                            Total Awards: {totalAward}E
                        </div>
                        <p className="awards-title">Award List:</p>

                        <div className="card prize-card">
                            <img className="card-img-top" src="https://img.capital.com/imgs/articles/662x308x0/shutterstock_1958528764.jpg" alt="Prize 1"/>
                                <div className="card-body">
                                    <h5 className="card-title">First Prize:</h5>
                                    <p className="card-text">{firstPrize}E</p>
                                </div>
                        </div>
                        <div className="card prize-card">
                            <img className="card-img-top" src="https://img.capital.com/imgs/articles/662x308x0/shutterstock_1958528764.jpg" alt="Prize 2"/>
                                <div className="card-body">
                                    <h5 className="card-title">Second Prize:</h5>
                                    <p className="card-text">{secondPrize}E</p>
                                </div>
                        </div>
                        <div className="card prize-card">
                            <img className="card-img-top" src="https://img.capital.com/imgs/articles/662x308x0/shutterstock_1958528764.jpg" alt="Prize 3"/>
                            <div className="card-body">
                                <h5 className="card-title">Third Prize:</h5>
                                <p className="card-text">{thirdPrize}E</p>
                            </div>
                        </div>
                        <p className="lottery-contract">Lottery Contract Address: {CONTRACT_ADDRESS}</p>
                        <p className="lottery-price">Lottery Price: {lotteryPrice}E</p>
                        <p className="lottery-open-time">Prize will open at: {lotteryOpenTime}</p>
                    </div>

                    <button className="btn btn-primary btn-sm refresh-button" onClick={refreshBtnHandler}>Refresh</button>
                    {/*{isLoading && <img src="https://en.pimg.jp/071/759/942/1/71759942.jpg" alt="Loading" />}*/}
                </div>

                <div className="board">
                    <div className="actionPart">
                        <button className="btn btn-primary btn-sm buy-button" onClick={buyBtnHandler}>Buy</button>
                        <p>Output</p>
                        <div className="input-group input-group-sm mb-3">
                            <div className="input-group-prepend">
                                <span className="input-group-text" id="inputGroup-sizing-sm">Secret Phrase 1:</span>
                            </div>
                            {buySecretPhrase1 !== null ? (
                                <input
                                    type="text"
                                    className="form-control"
                                    aria-label="Small"
                                    id="buyScretPhrase1"
                                    value={buySecretPhrase1}
                                    readOnly={true}
                                    aria-describedby="inputGroup-sizing-sm"
                                />
                            ) : (
                                <input
                                    type="text"
                                    className="form-control"
                                    aria-label="Small"
                                    id="buyScretPhrase1"
                                    readOnly={true}
                                    aria-describedby="inputGroup-sizing-sm"
                                />
                            )}
                        </div>
                        <div className="input-group input-group-sm mb-3">
                            <div className="input-group-prepend">
                                <span className="input-group-text" id="inputGroup-sizing-sm">Secret Phrase 2:</span>
                            </div>
                            {buySecretPhrase2 !== null ? (
                                <input
                                    type="text"
                                    className="form-control"
                                    aria-label="Small"
                                    id="buyScretPhrase2"
                                    value={buySecretPhrase2}
                                    readOnly={true}
                                    aria-describedby="inputGroup-sizing-sm"
                                />
                            ) : (
                                <input
                                    type="text"
                                    className="form-control"
                                    aria-label="Small"
                                    id="buyScretPhrase2"
                                    readOnly={true}
                                    aria-describedby="inputGroup-sizing-sm"
                                />
                            )}
                        </div>
                        {showBuyAlert && (
                            <Alert variant="primary" onClose={() => setshowBuyAlert(false)} dismissible>
                                {successfulBuyText}
                            </Alert>
                        )}
                    </div>
                    <hr/>
                    <div className="actionPart">
                        <div className="input-group input-group-sm mb-3">
                            <div className="input-group-prepend">
                                <span className="input-group-text" id="inputGroup-sizing-sm">Secret Phrase 1:</span>
                            </div>
                            <input type="text" className="form-control" aria-label="Small" id="redeemScretPhrase1"
                                   aria-describedby="inputGroup-sizing-sm"/>
                        </div>
                        <div className="input-group input-group-sm mb-3">
                            <div className="input-group-prepend">
                                <span className="input-group-text" id="inputGroup-sizing-sm">Secret Phrase 2:</span>
                            </div>
                            <input type="text" className="form-control" aria-label="Small" id="redeemScretPhrase2"
                                   aria-describedby="inputGroup-sizing-sm"/>
                        </div>
                        <button className="btn btn-primary btn-sm redeem-button" onClick={redeemBtnHandler}>Redeem</button>
                        {showAlert && (
                            <Alert variant="primary" onClose={() => setShowAlert(false)} dismissible>
                                {prizeText}
                            </Alert>
                        )}
                    </div>
                </div>

            </div>

        </div>
    )
}

export default Main;