import { describe, it } from "vitest";
import { disp,
  COMMUNITY_MINT_AMOUNT,
  INITIAL_WELSH,
  INITIAL_STREET,
  INITIAL_RATIO,
  TOLERANCE,
} from "../vitestconfig"

import {
  communityMint,
  lockLiquidity,
  provideLiquidity,
  removeLiquidity,
  transfer,
  getBalance,
} from "./__functions__";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

const WELSH = INITIAL_WELSH 
const STREET = WELSH * INITIAL_RATIO;

describe("=== LIQUIDITY ===", () => {
  it("=== DEPLOYER LOCK INITIAL LIQUIDITY ===", () => {
    communityMint(deployer, COMMUNITY_MINT_AMOUNT, true, disp)
          
    lockLiquidity(deployer, WELSH, disp)
    getBalance({ address: deployer, contractName: "exchange" }, "welshcorgicoin", WELSH, TOLERANCE, disp);
    getBalance({ address: deployer, contractName: "exchange" }, "street-token", STREET, TOLERANCE, disp);    
  });

  it("=== WALLET 1 PROVIDES LIQUIDITY BEFORE POOL INITIALIZED ===", () => {
    // STEP 1 MINT
    communityMint(deployer, COMMUNITY_MINT_AMOUNT, true, disp)
    
    // STEP 2 TRANSFER
    const TRANSFER_WELSH = 100000
    const TRANSFER_STREET = TRANSFER_WELSH * INITIAL_RATIO
    transfer("welshcorgicoin", deployer, wallet1, TRANSFER_WELSH, disp)
    transfer("street-token", deployer, wallet1, TRANSFER_STREET, disp)
    
    const PROVIDE_WELSH = TRANSFER_WELSH / 4
    getBalance({ address: deployer, contractName: "exchange" }, "welshcorgicoin", 0, TOLERANCE, disp);
    getBalance({ address: deployer, contractName: "exchange" }, "street-token", 0, TOLERANCE, disp); 
    
    // STEP 3 PROVIDE LIQUIDITY
    let resA = 0
    let resB = 0
    provideLiquidity(wallet1, PROVIDE_WELSH, resA, resB, TOLERANCE, disp)
  })

  it("=== WALLET 1 PROVIDES LIQUIDITY AFTER POOL INITIALIZED ===", () => {
    // STEP 1 MINT  
    communityMint(deployer, COMMUNITY_MINT_AMOUNT, true, disp)
    
    // STEP 2 LOCK INITIAL LIQUIDITY
    const WELSH = 1000000000000 
    const STREET = WELSH * INITIAL_RATIO
    lockLiquidity(deployer, WELSH, disp)
    getBalance({ address: deployer, contractName: "exchange" }, "welshcorgicoin", WELSH, TOLERANCE, disp);
    getBalance({ address: deployer, contractName: "exchange" }, "street-token", STREET, TOLERANCE, disp);
    
    // STEP 3 TRANSFER
    const TRANSFER_WELSH = 100000
    const TRANSFER_STREET = TRANSFER_WELSH * INITIAL_RATIO
    transfer("welshcorgicoin", deployer, wallet1, TRANSFER_WELSH, disp)
    transfer("street-token", deployer, wallet1, TRANSFER_STREET, disp)
    
    // STEP 4 PROVIDE LIQUIDITY
    const PROVIDE_WELSH = TRANSFER_WELSH / 4
    getBalance({ address: deployer, contractName: "exchange" }, "welshcorgicoin", WELSH, TOLERANCE, disp);
    getBalance({ address: deployer, contractName: "exchange" }, "street-token", STREET, TOLERANCE, disp); 
    
    let resA = WELSH
    let resB = STREET
    provideLiquidity(wallet1, PROVIDE_WELSH, resA, resB, TOLERANCE, disp)
  })

  it("=== WALLET 1 PROVIDES LP, TRANSFERS TO WALLET 2, WALLET 2 REMOVES LP ===", () => {
    // STEP 1 MINT STREET
    communityMint(deployer, COMMUNITY_MINT_AMOUNT, true, disp)
    communityMint(deployer, COMMUNITY_MINT_AMOUNT, true, disp) // mints more street to cover transfers

    // STEP 2 DEPLOYER PROVIDES INITIAL LP
    lockLiquidity(deployer, WELSH, disp)

    // STEP 3 DEPLOYER TRANSFERS 10% OF WELSH AND STREET TO WALLET 1
    const WELSH_TRANSFER = WELSH * 0.1
    const STREET_TRANSFER = WELSH_TRANSFER * INITIAL_RATIO
    transfer("welshcorgicoin", deployer, wallet1, WELSH_TRANSFER, disp)
    transfer("street-token", deployer, wallet1, STREET_TRANSFER, disp)

    // STEP 4 WALLET 1 PROVIDES 10% OF HOLDINGS TO LP
    const PROVIDED_WELSH = WELSH_TRANSFER * 0.2;
    const initialResA = INITIAL_WELSH;
    const initialResB = INITIAL_STREET;
    const providedAmountA = PROVIDED_WELSH;
    const providedAmountB = Math.floor((providedAmountA * initialResB) / initialResA);

    // New reserves after wallet1 provides liquidity
    const providedResA = initialResA + providedAmountA;
    const providedResB = initialResB + providedAmountB;
    // LP minted for wallet1's liquidity (first LP provision, so use geometric mean)
    provideLiquidity(wallet1, PROVIDED_WELSH, providedResA, providedResB, TOLERANCE, disp)
    
    // STEP 5 WALLET 1 TRANSFERS LP TO WALLET 2
    const providedLp = Math.floor(Math.sqrt(providedAmountA * providedAmountB));
    const TRANSFER_FACTOR = 1 // 1 means all of it
    const TRANSFER_LP = providedLp * TRANSFER_FACTOR
    getBalance(wallet1, "liquidity", TRANSFER_LP, TOLERANCE, disp);
    getBalance(wallet2, "liquidity", 0, TOLERANCE, disp);
    transfer("liquidity", wallet1, wallet2, TRANSFER_LP, disp)
    getBalance(wallet1, "liquidity", 0, TOLERANCE, disp);
    getBalance(wallet2, "liquidity", TRANSFER_LP, TOLERANCE, disp);

    // STEP 6 WALLET 2 REMOVES LP
    const reserveA = providedResA;
    const reserveB = providedResB;
    const removeLp = providedLp;
    const lpSupply = providedLp; // ✅ Only LP tokens from provide-liquidity
    const taxLp = Math.floor(removeLp * 0.1); // 10% tax
    const userLp = removeLp - taxLp;
    const expectedA = BigInt(userLp) * BigInt(reserveA) / BigInt(lpSupply);
    const expectedB = BigInt(userLp) * BigInt(reserveB) / BigInt(lpSupply);
    getBalance({ address: deployer, contractName: "exchange" }, "welshcorgicoin", reserveA, TOLERANCE, disp);
    getBalance({ address: deployer, contractName: "exchange" }, "street-token", reserveB, TOLERANCE, disp); 
    if (disp) { console.log("deficitA", Number(reserveA) - Number(expectedA))}
    if (disp) { console.log("deficitB", Number(reserveB) - Number(expectedB))}
    if (disp) { console.log("expectedA", expectedA)}
    if (disp) { console.log("expectedB", expectedB)}

    removeLiquidity(wallet2, removeLp, userLp, taxLp, Number(expectedA), Number(expectedB), disp)
  });
});