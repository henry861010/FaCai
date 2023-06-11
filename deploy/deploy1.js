async function main() {

   const c = await ethers.getContractFactory("Verifier");
   const hasher  = await c.deploy();
   console.log("ejciewoneivn:");
   console.log(hasher.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
