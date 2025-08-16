import { describe, it } from "vitest";
import { disp,
  COMMUNITY_MINT_AMOUNT,
  COMMUNITY_MINT_CAP,
  INITIAL_WELSH,
  INITIAL_STREET,
  INITIAL_LP,
  WELSH_TRANSFER
} from "../vitestconfig"

import {
  getBalance,
  communityMint,
  lockLiquidity,
  swapAB,
  transfer,
} from "./__functions__";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;

describe("exchange initial liquidity", () => {
  it("swap a for b test", () => {
    // STEP 1 - Mint Street
    communityMint(deployer, COMMUNITY_MINT_AMOUNT, 0, COMMUNITY_MINT_CAP, true, disp)

    // STEP 2 - Provide Initial Liquidity
    lockLiquidity(deployer, INITIAL_WELSH, disp)

    // STEP 3 - Transfer Welsh wallet1
    transfer("welshcorgicoin", deployer, wallet1, WELSH_TRANSFER, disp)
    
    // STEP 4 - Set up a large swap amount
    const WELSH_SWAP = 1000000; //
    const SLIP_MAX = 800; // basis points, 8% slippage
    const FEE_BASIS = 10000;

    // Use the same reserves as initial liquidity
    let aIn = WELSH_SWAP;
    let resA = INITIAL_WELSH;
    let resB = INITIAL_STREET;
    let exp = Math.floor((aIn * resB) / resA); // Expected output (no fees)
    let fee = 50; // 0.5% fee

    // A-side fee calculation
    let aFee = Math.floor((aIn * fee) / FEE_BASIS);
    let aInNet = aIn - aFee;
    let aReward = Math.floor(aFee / 2); // Half of fee goes to rewards

    // AMM calculation with net input
    let aInWithFee = aInNet * (FEE_BASIS - fee);
    let num = aInWithFee * resB;
    let den = (resA * FEE_BASIS) + aInWithFee;
    let bOut = Math.floor(num / den);

    // B-side fee calculation
    let bFee = Math.floor((bOut * fee) / FEE_BASIS);
    let bOutNet = bOut - bFee;
    let bReward = Math.floor(bFee / 2); // Half of fee goes to rewards

    // Slippage calculation
    let slip = Math.floor(((exp - bOut) * FEE_BASIS) / exp);
    let minB = Math.floor((bOut * (FEE_BASIS - SLIP_MAX)) / FEE_BASIS);

    if (disp) {
      console.log("=== SWAP A B CALCULATIONS ===");
      console.log("aIn:", aIn);
      console.log("resA:", resA);
      console.log("resB:", resB);
      console.log("exp:", exp);
      console.log("fee:", fee);
      console.log("aFee:", aFee);
      console.log("aInNet:", aInNet);
      console.log("aReward:", aReward);
      console.log("aInWithFee:", aInWithFee);
      console.log("num:", num);
      console.log("den:", den);
      console.log("bOut:", bOut);
      console.log("bFee:", bFee);
      console.log("bOutNet:", bOutNet);
      console.log("bReward:", bReward);
      console.log("slip:", slip);
      console.log("minB:", minB);
    }
    
    swapAB(wallet1, WELSH_SWAP, slip, SLIP_MAX, aIn, bOutNet, aFee, bFee, disp)

    // STEP 5 - Check Welsh and Street balances
    const expectedWelshBalance = WELSH_TRANSFER - aIn
    getBalance(wallet1, "welshcorgicoin", BigInt(expectedWelshBalance), disp)
    getBalance(wallet1, "street-token", BigInt(bOutNet), disp)
  })
});