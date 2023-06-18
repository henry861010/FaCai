async function main() {

   const b = await ethers.getContractFactory("Verifier");
   const verifier  = await b.deploy();
   console.log("********************verifier: ", verifier.address);
   const a = await ethers.getContractFactory("FaCai");
   const FaCai = await a.deploy(verifier.address,20,1686573816,3,2,1,1);
   console.log("********************FaCai: ", FaCai.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });

