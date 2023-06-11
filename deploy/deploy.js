async function main() {

   const c = await ethers.getContractFactory("IHasher");
   const hasher  = await c.deploy();
   const b = await ethers.getContractFactory("Verifier");
   const verifier  = await b.deploy();
   const a = await ethers.getContractFactory("FaCai");
   const FaCai = await a.deploy(verifier,hasher.address,20,1686573816,3,2,3,1);
   
   console.log(FaCai.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
