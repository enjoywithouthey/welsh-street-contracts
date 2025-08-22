import { describe, it } from "vitest";
import { disp,
  COMMUNITY_MINT_AMOUNT,
  COMMUNITY_MINT_CAP,
  EMISSION_AMOUNT,
  EMISSION_EPOCHS,
  TOTAL_SUPPLY,
} from "../vitestconfig"

import {
  communityMint,
  emissionMint,
  mineBurnBlock,
  getCommunityMinted,
  getCurrentEpoch,
  getTotalSupply,
} from "./__functions__";
import { get } from "http";

let totalSupply = 0;

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;

describe("=== MINTING ===", () => {
  it("=== COMMUNITY MINT UNTIL CAP IS REACHED ===", () => {
    const mints = 5
    let minted = 0;
    for (let i = 1; i <= mints; i++) {// COMMUNITY MINT STREET UNTIL FAIL
      if (disp) {console.log("MINT %s", i)}
      communityMint(deployer, COMMUNITY_MINT_AMOUNT, minted, COMMUNITY_MINT_CAP, disp)
      if (minted < COMMUNITY_MINT_CAP) {
        minted += COMMUNITY_MINT_AMOUNT;
      } else {
        minted = COMMUNITY_MINT_CAP;
      }
      console.log("minted:", minted)
      getCommunityMinted(deployer, minted, disp)
    }
  })

  it("=== DEPLOYER MINTS ZERO ===", () => {
    if (disp) {console.log("totalSupply:", totalSupply)}
    communityMint(deployer, 0, 0, COMMUNITY_MINT_CAP, disp)
  })
  
  it("=== DEPLOYER MINTS MORE THAN THE CAP ===", () => {
    const overkillMint = COMMUNITY_MINT_AMOUNT * 5
    if (disp) {console.log("totalSupply:", totalSupply)}
    communityMint(deployer, overkillMint, 0, COMMUNITY_MINT_CAP, disp)
  })
  
  it("=== WALLET 1 CALLS COMMUNITY MINT ===", () => {
    if (disp) {console.log("totalSupply:", totalSupply)}
    communityMint(wallet1, COMMUNITY_MINT_AMOUNT, 0, COMMUNITY_MINT_CAP, disp)
  })

  it("=== EMISSION MINT UNTIL EPOCHS REACHED ===", () => {
    let minted = 0;
    for (let i = 0; i < 12; i++) {
      const expectedEpoch = Math.min(i, EMISSION_EPOCHS);
      const currentEpoch = getCurrentEpoch(deployer, expectedEpoch, disp)
      emissionMint(deployer, i, EMISSION_AMOUNT, EMISSION_EPOCHS, disp);
      mineBurnBlock(i + 4, disp);
      if (currentEpoch < EMISSION_EPOCHS) {
        minted += EMISSION_AMOUNT
      }
      if (disp) {console.log("total minted:", minted)}
    }
  });

  it("=== EMISSION MINT UNTIL TOTAL SUPPLY REACHED ===", () => {
    let counter = 0;
    let totalSupply = 0n;

    while (true) {
      emissionMint(deployer, counter, EMISSION_AMOUNT, EMISSION_EPOCHS, disp);
      mineBurnBlock(counter + 4, disp);
      totalSupply = getTotalSupply(deployer, "street-token", totalSupply + BigInt(EMISSION_AMOUNT), disp);
      counter++;
      if (disp) {console.log(`After emission #${counter}, total supply: ${totalSupply}`);}
      if (totalSupply >= EMISSION_AMOUNT * 9) break;
    }
  }); 
});