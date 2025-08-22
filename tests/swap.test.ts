import { describe, it } from "vitest";
import { disp,
  COMMUNITY_MINT_AMOUNT,
  INITIAL_WELSH,
  INITIAL_STREET,
  TOLERANCE,
  STREET_TRANSFER,
  WELSH_TRANSFER,
} from "../vitestconfig"

import {
  getBalance,
  communityMint,
  lockLiquidity,
  swapABcalcs,
  swapAB,
  swapBAcalcs,
  swapBA,
  transfer,
} from "./__functions__";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;

describe("=== SWAPS ===", () => {
  it("=== SWAP A FOR B ===", () => {
    // STEP 1 - Mint Street
    communityMint(deployer, COMMUNITY_MINT_AMOUNT, true, disp)

    // STEP 2 - Provide Initial Liquidity
    lockLiquidity(deployer, INITIAL_WELSH, disp)

    // STEP 3 - Transfer Welsh wallet1
    transfer("welshcorgicoin", deployer, wallet1, WELSH_TRANSFER, disp)
    
    // STEP 4 - Swap
    const WELSH_SWAP = WELSH_TRANSFER; //
    const SLIP_MAX = 200; // <== CHANGE SLIP MAX TO FAIL TEST WITH 604>
    const { amountBnet, feeA, feeB, slip } = swapABcalcs(WELSH_SWAP, INITIAL_WELSH, INITIAL_STREET, SLIP_MAX, disp);
    swapAB(wallet1, WELSH_SWAP, slip, SLIP_MAX, amountBnet, feeA, feeB, TOLERANCE, disp)
    
    // STEP 5 - Check Welsh and Street balances
    if (slip > SLIP_MAX) {      
      getBalance(wallet1, "welshcorgicoin", WELSH_TRANSFER, TOLERANCE, disp)
      getBalance(wallet1, "street-token", 0, TOLERANCE, disp)
    } else {
      const expectedWelshBalance = WELSH_TRANSFER - WELSH_SWAP
      getBalance(wallet1, "welshcorgicoin", expectedWelshBalance, TOLERANCE, disp)
      getBalance(wallet1, "street-token", amountBnet, TOLERANCE, disp)
    }
  })

  it("=== SWAP B FOR A ===", () => {
    // STEP 1 - Mint Street
    communityMint(deployer, COMMUNITY_MINT_AMOUNT, true, disp)
    
    // STEP 1.1 - Mint Street again to cover transfer
    communityMint(deployer, COMMUNITY_MINT_AMOUNT, true, disp)

    // STEP 2 - Provide Initial Liquidity
    lockLiquidity(deployer, INITIAL_WELSH, disp)

    // STEP 3 - Transfer Street wallet1
    transfer("street-token", deployer, wallet1, STREET_TRANSFER, disp)

    // STEP 3.1 = Check Balances
    getBalance(wallet1, "street-token", STREET_TRANSFER, TOLERANCE, disp)
    getBalance(wallet1, "welshcorgicoin", 0, TOLERANCE, disp)
    
    // STEP 4 - Swap
    const STREET_SWAP = STREET_TRANSFER;
    const SLIP_MAX = 200;
    const { amountAnet, feeA, feeB, slip } = swapBAcalcs(STREET_SWAP, INITIAL_WELSH, INITIAL_STREET, SLIP_MAX, disp);
    swapBA(wallet1, STREET_SWAP, slip, SLIP_MAX, amountAnet, feeA, feeB, TOLERANCE, disp)

    // STEP 5 - Check Welsh and Street balances
    if (slip > SLIP_MAX) {      
      getBalance(wallet1, "street-token", 0, TOLERANCE, disp)
      getBalance(wallet1, "welshcorgicoin", amountAnet, TOLERANCE, disp)
    } else {
      const expectedStreetBalance = 0;
      const expectedWelshBalance = amountAnet;
      getBalance(wallet1, "street-token", expectedStreetBalance, TOLERANCE, disp)
      getBalance(wallet1, "welshcorgicoin", expectedWelshBalance, TOLERANCE, disp)
    }
  })
});