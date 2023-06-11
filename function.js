const fs = require('fs')
const assert = require('assert')
const { bigInt } = require('snarkjs')
const crypto = require('crypto')
const circomlib = require('circomlib')
const merkleTree = require('fixed-merkle-tree')
const Web3 = require('web3')
const buildGroth16 = require('websnark/src/groth16')
const websnarkUtils = require('websnark/src/utils')
const { toWei } = require('web3-utils')

let web3, contract, netId, circuit, proving_key, groth16
const MERKLE_TREE_HEIGHT = 20
const RPC_URL = 'https://kovan.infura.io/v3/0279e3bdf3ee49d0b547c643c2ef78ef'
const PRIVATE_KEY = 'ad5b6eb7ee88173fa43dedcff8b1d9024d03f6307a1143ecf04bea8ed40f283f' // 0x94462e71A887756704f0fb1c0905264d487972fE
const CONTRACT_ADDRESS = '0xD6a6AC46d02253c938B96D12BE439F570227aE8E'
const AMOUNT = '1'
// CURRENCY = 'ETH'

/** Generate random number of specified byte length */
const rbigint = (nbytes) => bigInt.leBuff2int(crypto.randomBytes(nbytes))

/** Compute pedersen hash */
const pedersenHash = (data) => circomlib.babyJub.unpackPoint(circomlib.pedersenHash.hash(data))[0]

/** BigNumber to hex string of specified length */
const toHex = (number, length = 32) =>
  '0x' +
  (number instanceof Buffer ? number.toString('hex') : bigInt(number).toString(16)).padStart(length * 2, '0')

/**
 * Create deposit object from secret and nullifier
 */
function createDeposit(nullifier, secret) {
  let deposit = { nullifier, secret }
  deposit.preimage = Buffer.concat([deposit.nullifier.leInt2Buff(31), deposit.secret.leInt2Buff(31)])
  deposit.commitment = pedersenHash(deposit.preimage)
  deposit.nullifierHash = pedersenHash(deposit.nullifier.leInt2Buff(31))
  return deposit
}

async function  getGameInfo() {
    let result = await contract.methods.getGameInfo().send({ from: web3.eth.defaultAccount, gas: 2e6 })
    let prize1 = result[0]
    let prize2 = result[1]
    let prize3 = result[2]
    let timeEnd = result[3]
    let totalPrize = result[4]
    let ticketPrice = result[5]
    let contractaddress = result[6]
    let numberOfBuyer = result[8]
    return [prize1, prize2, prize3, timeEnd, totalPrize, ticketPrice, contractaddress, numberOfBuyer]
}

/**
 * Make an ETH deposit
 */
async function deposit() {
  const deposit = createDeposit(rbigint(31), rbigint(31))
  const tx = await contract.methods.deposit(toHex(deposit.commitment)).send({ value: toWei(AMOUNT), from: web3.eth.defaultAccount, gas: 2e6 })
  return deposit
}

/**
 * Do an ETH withdrawal
 * @param note Note to withdraw
 * @param recipient Recipient address
 */
async function withdraw(deposit) {
  const { proof, args } = await generateSnarkProof(deposit)
  const tx = await contract.methods.withdraw(proof, ...args).send({ from: web3.eth.defaultAccount, gas: 1e6 })
}

/**
 * Generate merkle tree for a deposit.
 * Download deposit events from the contract, reconstructs merkle tree, finds our deposit leaf
 * in it and generates merkle proof
 * @param deposit Deposit object
 */
async function generateMerkleProof(deposit) {
  console.log('Getting contract state...')
  const events = await contract.getPastEvents('Deposit', { fromBlock: 0, toBlock: 'latest' })
  const leaves = events
    .sort((a, b) => a.returnValues.leafIndex - b.returnValues.leafIndex) // Sort events in chronological order
    .map((e) => e.returnValues.commitment)
  const tree = new merkleTree(MERKLE_TREE_HEIGHT, leaves)

  // Find current commitment in the tree
  let depositEvent = events.find((e) => e.returnValues.commitment === toHex(deposit.commitment))
  let leafIndex = depositEvent ? depositEvent.returnValues.leafIndex : -1

  // Validate that our data is correct (optional)
  const isValidRoot = await contract.methods.isKnownRoot(toHex(tree.root())).call()
  const isSpent = await contract.methods.isSpent(toHex(deposit.nullifierHash)).call()
  assert(isValidRoot === true, 'Merkle tree is corrupted')
  assert(isSpent === false, 'The note is already spent')
  assert(leafIndex >= 0, 'The deposit is not found in the tree')

  // Compute merkle proof of our commitment
  const { pathElements, pathIndices } = tree.path(leafIndex)
  return { pathElements, pathIndices, root: tree.root() }
}

/**
 * Generate SNARK proof for withdrawal
 * @param deposit Deposit object
 * @param recipient Funds recipient
 */
async function generateSnarkProof(deposit) {
  // Compute merkle proof of our commitment
  const { root, pathElements, pathIndices } = await generateMerkleProof(deposit)

  // Prepare circuit input
  const input = {
    // Public snark inputs
    root: root,
    nullifierHash: deposit.nullifierHash,

    // Private snark inputs
    nullifier: deposit.nullifier,
    secret: deposit.secret,
    pathElements: pathElements,
    pathIndices: pathIndices,
  }

  const proofData = await websnarkUtils.genWitnessAndProve(groth16, input, circuit, proving_key)
  const { proof } = websnarkUtils.toSolidityInput(proofData)

  const args = [
    toHex(input.root),
    toHex(input.nullifierHash)
  ]

  return { proof, args }
}

async function main() {
  web3 = new Web3(new Web3.providers.HttpProvider(RPC_URL, { timeout: 5 * 60 * 1000 }), null, {
    transactionConfirmationBlocks: 1,
  })
  circuit = require(__dirname + '/../build/circuits/withdraw.json')
  proving_key = fs.readFileSync(__dirname + '/../build/circuits/withdraw_proving_key.bin').buffer
  groth16 = await buildGroth16()
  netId = await web3.eth.net.getId()
  contract = new web3.eth.Contract(require('../build/contracts/ETHTornado.json').abi, CONTRACT_ADDRESS)
  const account = web3.eth.accounts.privateKeyToAccount('0x' + PRIVATE_KEY)
  web3.eth.accounts.wallet.add('0x' + PRIVATE_KEY)
  // eslint-disable-next-line require-atomic-updates
  web3.eth.defaultAccount = account.address

  const note = await deposit()
  console.log('Deposited note:', note)
  await withdraw(note, web3.eth.defaultAccount)
  console.log('Done')
  process.exit()
}

main()