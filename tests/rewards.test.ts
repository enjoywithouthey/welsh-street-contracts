import { describe, it } from "vitest";
import { disp,
  DECIMALS,
  COMMUNITY_MINT_AMOUNT,
  COMMUNITY_MINT_CAP,
  INITIAL_WELSH,
  INITIAL_STREET,
  TOLERANCE,
} from "../vitestconfig"

import {
  claimRewards,
  communityMint,
  lockLiquidity,
  provideLiquidity,
  swapABcalcs,
  swapAB,
  swapBAcalcs,
  swapBA,
  trackBalances,
  trackReserves,
  trackRewards,
  transfer,
  getBalance,
  getRewardPoolInfo,
  getRewardUserInfo,
  getTotalSupply
} from "./__functions__";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

describe("=== REWARDS ===", () => {
  it("=== WALLET 1 SWAP. WALLET 2 CLAIMS REWARDS ===", () => {
    // STEP 1 - Mint Street
    communityMint(deployer, COMMUNITY_MINT_AMOUNT, 0, COMMUNITY_MINT_CAP, disp)

    // STEP 2 - Provide Initial Liquidity
    lockLiquidity(deployer, INITIAL_WELSH, disp)

    // STEP 3.1 - Transfer Welsh wallet1
    const WELSH_TRANSFER_1 = 10000000000;
    transfer("welshcorgicoin", deployer, wallet1, WELSH_TRANSFER_1, disp)

    // STEP 3.2 - Transfer Welsh wallet2
    const WELSH_TRANSFER_2 = 1000000000;
    transfer("welshcorgicoin", deployer, wallet2, WELSH_TRANSFER_2, disp)
    
    // STEP 4 - Swap a few times to accumulate rewards
    const SLIP_MAX = 800;
    let slip = 0,
        amountBnet = 0,
        feeA = 0,
        feeB = 0,
        rewardA = 0,
        rewardB = 0,
        rewardAccA = 0,
        rewardAccB = 0,
        reserveA = 0,
        reserveB = 0,
        shareA = 0,
        shareB = 0;
    
    ({ reserveA, reserveB } = trackReserves(0, 0, INITIAL_WELSH, INITIAL_STREET, disp));
    const WELSH_SWAP_1 = 110000000; //
    ({ amountBnet, feeA, feeB, rewardA, rewardB, slip } = swapABcalcs(WELSH_SWAP_1, reserveA, reserveB, SLIP_MAX, disp));
    swapAB( wallet1, WELSH_SWAP_1, slip, SLIP_MAX, amountBnet, feeA, feeB, TOLERANCE, disp );
    ({ rewardAccA, rewardAccB } = trackRewards(0, 0, rewardA, rewardB, disp));
    
    ({ reserveA, reserveB } = trackReserves(reserveA, reserveB, WELSH_SWAP_1, -amountBnet, disp));
    const WELSH_SWAP_2 = 12000000;
    ({ amountBnet, feeA, feeB, rewardA, rewardB, slip } = swapABcalcs(WELSH_SWAP_2, reserveA, reserveB, SLIP_MAX, disp));
    swapAB( wallet1, WELSH_SWAP_2, slip, SLIP_MAX, amountBnet, feeA, feeB, TOLERANCE, disp );
    ({ rewardAccA, rewardAccB } = trackRewards(rewardA, rewardB, rewardAccA, rewardAccB, disp));
    
    ({ reserveA, reserveB } = trackReserves(reserveA, reserveB, WELSH_SWAP_2, -amountBnet, disp));
    const STREET_SWAP_3 = 3000000000; let amountAnet
    ({ amountAnet, feeA, feeB, rewardA, rewardB, slip } = swapBAcalcs(STREET_SWAP_3, reserveA, reserveB, SLIP_MAX, disp));
    swapBA( wallet1, STREET_SWAP_3, slip, SLIP_MAX, amountAnet, feeA, feeB, TOLERANCE, disp );
    ({ rewardAccA, rewardAccB } = trackRewards(rewardA, rewardB, rewardAccA, rewardAccB, disp));
    
    // STEP 5 - Check exchange and rewards contract balances
    ({ reserveA, reserveB } = trackReserves(reserveA, reserveB, -amountAnet, STREET_SWAP_3, disp));
    getBalance({ address: deployer, contractName: "exchange" }, "welshcorgicoin", reserveA, TOLERANCE, disp);
    getBalance({ address: deployer, contractName: "exchange" }, "street-token", reserveB, TOLERANCE, disp);
    getBalance({ address: deployer, contractName: "rewards" }, "welshcorgicoin", rewardAccA, TOLERANCE, disp);
    getBalance({ address: deployer, contractName: "rewards" }, "street-token", rewardAccB, TOLERANCE, disp);
    
    // STEP 6 - Wallet2 swaps Welsh to Street
    const WELSH_SWAP_21 = WELSH_TRANSFER_2 / 2; // Amount for wallet2 swap
    ({ amountBnet, feeA, feeB, rewardA, rewardB, slip } = swapABcalcs(WELSH_SWAP_21, reserveA, reserveB, SLIP_MAX, disp));
    swapAB( wallet2, WELSH_SWAP_21, slip, SLIP_MAX, amountBnet, feeA, feeB, TOLERANCE, disp );
    ({ rewardAccA, rewardAccB } = trackRewards(rewardA, rewardB, rewardAccA, rewardAccB, disp));
    ({ reserveA, reserveB } = trackReserves(reserveA, reserveB, WELSH_SWAP_21, -amountBnet, disp));
    
    // STEP 7 Wallet 2 Provides Liquidity
    getBalance(wallet2, "welshcorgicoin", WELSH_SWAP_21, TOLERANCE, disp);
    getBalance(wallet2, "street-token", amountBnet, TOLERANCE, disp);
    const WELSH2LP = Math.floor(WELSH_SWAP_21 / 2);
    let amountLp = provideLiquidity(wallet2, WELSH2LP, reserveA, reserveB, TOLERANCE, disp)
    getTotalSupply(
      deployer,
      "liquidity",
      BigInt(amountLp),
      disp);
    
    // STEP 8 - Check rewards pool info
    shareA = Math.floor((rewardAccA * DECIMALS) / Number(amountLp));
    shareB = Math.floor((rewardAccB * DECIMALS) / Number(amountLp));
    getRewardPoolInfo(
      deployer,
      rewardAccA,
      rewardAccB,
      shareA,
      shareB,
      disp);
    
    // STEP 9 - Check wallet2 reward-user-balance using get-reward-user-balances
    const expRewardAccA = Math.floor(Number(amountLp) * shareA / DECIMALS);
    const expRewardAccB = Math.floor(Number(amountLp) * shareB / DECIMALS);
    let debtA = 0; 
    let debtB = 0;
    let unclaimedA = expRewardAccA;
    let unclaimedB = expRewardAccB;
    getRewardUserInfo(
      deployer, 
      wallet2, 
      BigInt(amountLp), 
      expRewardAccA, 
      expRewardAccB,
      debtA, 
      debtB, 
      unclaimedA, 
      unclaimedB,
      TOLERANCE,
      disp);
  
    // STEP 10 - Wallet2 claim rewards and check wallet2 balances
    const amountB2Lp = Math.floor((WELSH2LP * reserveB) / reserveA);
    let expBalanceA = WELSH_SWAP_21 - WELSH2LP; // Remaining Welsh after providing liquidity
    let expBalanceB = amountBnet - amountB2Lp; // Remaining Street after providing liquidity   
    getBalance(wallet2, "welshcorgicoin", expBalanceA, TOLERANCE, disp);
    getBalance(wallet2, "street-token", expBalanceB, TOLERANCE, disp);
    getBalance(wallet2, "liquidity", Number(amountLp), TOLERANCE, disp);

    claimRewards(
      wallet2, 
      BigInt(amountLp), 
      unclaimedA, 
      unclaimedB, 
      debtA, 
      debtB, 
      TOLERANCE,
      disp);  

    debtA = expRewardAccA;
    debtB = expRewardAccB;
    unclaimedA = 0;
    unclaimedB = 0;
    getRewardUserInfo(
      deployer, 
      wallet2, 
      BigInt(amountLp), 
      expRewardAccA, 
      expRewardAccB,
      debtA, 
      debtB, 
      unclaimedA, 
      unclaimedB,
      TOLERANCE,
      disp);
      
    expBalanceA += expRewardAccA; // Welsh after claiming rewards
    expBalanceB += expRewardAccB; //Street after claiming rewards
    getBalance(wallet2, "welshcorgicoin", expBalanceA, TOLERANCE, disp);
    getBalance(wallet2, "street-token", expBalanceB, TOLERANCE, disp);
    getBalance(wallet2, "liquidity", Number(amountLp), TOLERANCE, disp);
  })

  it("=== WALLET1 TRIES TO CLAIM WITH NO LP ===", () => {
    // STEP 1 - Mint Street
    communityMint(deployer, COMMUNITY_MINT_AMOUNT, 0, COMMUNITY_MINT_CAP, disp)

    // STEP 2 - Provide Initial Liquidity
    lockLiquidity(deployer, INITIAL_WELSH, disp)

    // STEP 3.1 - Transfer Welsh wallet1
    const WELSH_TRANSFER_1 = 10000000000;
    transfer("welshcorgicoin", deployer, wallet1, WELSH_TRANSFER_1, disp)
    
    // STEP 4 - Swap a few times to accumulate rewards
    const SLIP_MAX = 800;
    let slip = 0,
        amountBnet = 0,
        balanceA = WELSH_TRANSFER_1,
        balanceB = 0,
        feeA = 0,
        feeB = 0,
        rewardA = 0,
        rewardB = 0,
        rewardAccA = 0,
        rewardAccB = 0,
        reserveA = 0,
        reserveB = 0,
        shareA = 0,
        shareB = 0;
    
    ({ reserveA, reserveB } = trackReserves(0, 0, INITIAL_WELSH, INITIAL_STREET, disp));
    const WELSH_SWAP_1 = 110000000; //
    ({ amountBnet, feeA, feeB, rewardA, rewardB, slip } = swapABcalcs(WELSH_SWAP_1, reserveA, reserveB, SLIP_MAX, disp));
    swapAB( wallet1, WELSH_SWAP_1, slip, SLIP_MAX, amountBnet, feeA, feeB, TOLERANCE, disp );
    ({ balanceA, balanceB } = trackBalances(balanceA, balanceB, -WELSH_SWAP_1, amountBnet, disp));
    ({ rewardAccA, rewardAccB } = trackRewards(0, 0, rewardA, rewardB, disp));
    
    ({ reserveA, reserveB } = trackReserves(reserveA, reserveB, WELSH_SWAP_1, -amountBnet, disp));
    const WELSH_SWAP_2 = 12000000;
    ({ amountBnet, feeA, feeB, rewardA, rewardB, slip } = swapABcalcs(WELSH_SWAP_2, reserveA, reserveB, SLIP_MAX, disp));
    swapAB( wallet1, WELSH_SWAP_2, slip, SLIP_MAX, amountBnet, feeA, feeB, TOLERANCE, disp );
    ({ balanceA, balanceB } = trackBalances(balanceA, balanceB, -WELSH_SWAP_2, amountBnet, disp));
    ({ rewardAccA, rewardAccB } = trackRewards(rewardA, rewardB, rewardAccA, rewardAccB, disp));
    
    ({ reserveA, reserveB } = trackReserves(reserveA, reserveB, WELSH_SWAP_2, -amountBnet, disp));
    const STREET_SWAP_3 = 3000000000; let amountAnet
    ({ amountAnet, feeA, feeB, rewardA, rewardB, slip } = swapBAcalcs(STREET_SWAP_3, reserveA, reserveB, SLIP_MAX, disp));
    swapBA( wallet1, STREET_SWAP_3, slip, SLIP_MAX, amountAnet, feeA, feeB, TOLERANCE, disp );
    ({ balanceA, balanceB } = trackBalances(balanceA, balanceB, amountAnet, -STREET_SWAP_3, disp));
    ({ rewardAccA, rewardAccB } = trackRewards(rewardA, rewardB, rewardAccA, rewardAccB, disp));

    // STEP 4.1 Check wallet1 balances
    getBalance(wallet1, "welshcorgicoin", balanceA, TOLERANCE, disp);
    getBalance(wallet1, "street-token", balanceB, TOLERANCE, disp);
  
    // STEP 5 - Check exchange and rewards contract balances
    ({ reserveA, reserveB } = trackReserves(reserveA, reserveB, -amountAnet, STREET_SWAP_3, disp));
    getBalance({ address: deployer, contractName: "exchange" }, "welshcorgicoin", reserveA, TOLERANCE, disp);
    getBalance({ address: deployer, contractName: "exchange" }, "street-token", reserveB, TOLERANCE, disp);
    getBalance({ address: deployer, contractName: "rewards" }, "welshcorgicoin", rewardAccA, TOLERANCE, disp);
    getBalance({ address: deployer, contractName: "rewards" }, "street-token", rewardAccB, TOLERANCE, disp);
    
    // STEP 6 - Check rewards pool info
    const amountLp = 0; // No LP provided
    shareA = 0; // Math.floor((rewardAccA * DECIMALS) / Number(amountLp));
    shareB = 0; // Math.floor((rewardAccB * DECIMALS) / Number(amountLp));
    getRewardPoolInfo(
      deployer,
      rewardAccA,
      rewardAccB,
      shareA,
      shareB,
      disp);
    
    // STEP 9 - Check wallet1 reward-user-balance using get-reward-user-balances
    const expRewardAccA = Math.floor(Number(amountLp) * shareA / DECIMALS);
    const expRewardAccB = Math.floor(Number(amountLp) * shareB / DECIMALS);
    let debtA = 0; 
    let debtB = 0;
    let unclaimedA = expRewardAccA;
    let unclaimedB = expRewardAccB;
    getRewardUserInfo(
      deployer, 
      wallet1, 
      BigInt(amountLp), 
      expRewardAccA, 
      expRewardAccB,
      debtA, 
      debtB, 
      unclaimedA, 
      unclaimedB,
      TOLERANCE,
      disp);
  
    // STEP 10 - Wallet1 tries to claim rewards with no LP 
    getBalance(wallet1, "liquidity", Number(amountLp), TOLERANCE, disp);

    claimRewards(
      wallet2, 
      BigInt(amountLp), 
      unclaimedA, 
      unclaimedB, 
      debtA, 
      debtB, 
      TOLERANCE,
      disp);  

    debtA = expRewardAccA;
    debtB = expRewardAccB;
    unclaimedA = 0;
    unclaimedB = 0;
    getRewardUserInfo(
      deployer, 
      wallet2, 
      BigInt(amountLp), 
      expRewardAccA, 
      expRewardAccB,
      debtA, 
      debtB, 
      unclaimedA, 
      unclaimedB,
      TOLERANCE,
      disp);
      
    getBalance(wallet1, "welshcorgicoin", balanceA, TOLERANCE, disp);
    getBalance(wallet1, "street-token", balanceB, TOLERANCE, disp);
    getBalance(wallet1, "liquidity", Number(amountLp), TOLERANCE, disp);
  })
})