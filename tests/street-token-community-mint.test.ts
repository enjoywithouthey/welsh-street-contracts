import { describe, expect, it } from "vitest";
import { disp,
  COMMUNITY_MINT_AMOUNT,
  COMMUNITY_MINT_CAP,
} from "../vitestconfig"

import {
  communityMint,
  getCirculatingSupply,
  getCommunityMinted,
  lockLiquidity,
  getBalance,
} from "./__functions__";

let circulatingSupply = 0;

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;

describe("street token community mint", () => {
  it("---COMMUNITY MINT UNTIL CAP IS REACHED---", () => {
    const mints = 3
    for (let i = 1; i <= mints; i++) {// COMMUNITY MINT STREET UNTIL FAIL
      if (disp) {console.log("MINT %s", i)}
      const success = i < mints; 
      communityMint(deployer, COMMUNITY_MINT_AMOUNT, circulatingSupply, COMMUNITY_MINT_CAP, success, disp)
      if (i < mints) {circulatingSupply = circulatingSupply + COMMUNITY_MINT_AMOUNT}
      if (disp) {console.log("circulatingSupply:", circulatingSupply)}
    }
    const WELSH = 1000000000000 
    const STREET = WELSH * 100
    lockLiquidity(deployer, WELSH, disp)
    getBalance({ address: deployer, contractName: "welsh-street-exchange" }, "welshcorgicoin", WELSH, disp);
    getBalance({ address: deployer, contractName: "welsh-street-exchange" }, "street-token", STREET, disp);    
  
    getCirculatingSupply(deployer, BigInt(circulatingSupply), disp)
    getCommunityMinted(deployer, BigInt(circulatingSupply), disp)
  })

  it("---DEPLOYER MINTS ZERO---", () => {
      if (disp) {console.log("circulatingSupply:", circulatingSupply)}
      communityMint(deployer, 0, circulatingSupply, COMMUNITY_MINT_CAP, true, disp)
  })

  it("---DEPLOYER MINTS MORE THAN THE CAP---", () => {
      const overkillMint = COMMUNITY_MINT_AMOUNT * 5
      if (disp) {console.log("circulatingSupply:", circulatingSupply)}
      communityMint(deployer, overkillMint, circulatingSupply, COMMUNITY_MINT_CAP, false, disp)
  })

  it("---WALLET 1 CALLS COMMUNITY MINT---", () => {
      if (disp) {console.log("circulatingSupply:", circulatingSupply)}
      communityMint(wallet1, COMMUNITY_MINT_AMOUNT, circulatingSupply, COMMUNITY_MINT_CAP, false, disp)
  })
});