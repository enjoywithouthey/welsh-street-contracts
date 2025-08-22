import { Cl } from "@stacks/transactions";
import { expect } from "vitest";
import { FEE_BASIS, INITIAL_RATIO } from "../vitestconfig";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;

export function claimRewards(
  sender: any,
  amountLp: bigint,
  claimedA: number,
  claimedB: number,
  debtA: number,
  debtB: number,
  tolerance: number,
  disp: boolean
  ){
  const test = simnet.callPublicFn(
    "rewards",
    "claim-rewards",
    [],
    sender
  );
  const actualObj = (test.result as any).value.value;
  const actual = {
    amountLp: BigInt(actualObj["amount-lp"].value),
    claimedA: Number(actualObj["claimed-a"].value),
    claimedB: Number(actualObj["claimed-b"].value),
    debtA: Number(actualObj["debt-a"].value),
    debtB: Number(actualObj["debt-b"].value),
  };
  const expected = {
    amountLp,
    claimedA,
    claimedB,
    debtA,
    debtB
  };
  const nanDiff = (actual: number | bigint, expected: number | bigint) => {
    const numActual = typeof actual === "bigint" ? Number(actual) : actual;
    const numExpected = typeof expected === "bigint" ? Number(expected) : expected;
    if (numExpected === 0) return 0;
    const allowedDiff = Math.abs(numActual - numExpected) / numExpected * FEE_BASIS;
    return isNaN(allowedDiff) ? 0 : allowedDiff;
  };
  const differ = {
    amountLp: nanDiff(actual.amountLp, amountLp),
    claimedA: nanDiff(actual.claimedA, claimedA),
    claimedB: nanDiff(actual.claimedB, claimedB),
    debtA: nanDiff(actual.debtA, debtA),
    debtB: nanDiff(actual.debtB, debtB),
  };
  if (disp) {
    console.log("=== Claim Rewards Results ===");
    console.log("Actual:", actual);
    console.log("Expect:", expected);
    console.log("Differ:", differ);
  }
  type ClaimKey = keyof typeof expected;
  (Object.keys(expected) as ClaimKey[]).forEach(key => {
    const expectedVal = typeof expected[key] === "bigint" ? Number(expected[key]) : expected[key];
    const allowedDiff = Math.floor(Math.abs(expectedVal) * tolerance / FEE_BASIS);
    expect(differ[key]).toBeLessThanOrEqual(allowedDiff);
  });
}

export function communityMint(
  sender: any,
  amount: number,
  minted: number,
  cap: number,
  disp: boolean,
  ){
  const test = simnet.callPublicFn(
    "street-token",
    "community-mint",
    [Cl.uint(amount)],
    sender
  );
  if (sender != deployer) {
    expect(test.result).toEqual(Cl.error(Cl.uint(901)));
    if (disp) {console.log("communityMint:", test.result)}
    return
  }
    else if (amount <= 0) {
    expect(test.result).toEqual(Cl.error(Cl.uint(1)));
    if (disp) {console.log("communityMint:", test.result)}
    return
  }
  else if (minted + amount > cap) {
    expect(test.result).toEqual(Cl.error(Cl.uint(906)));
    if (disp) {console.log("communityMint:", test.result)}
    return
  }
  else {
    expect(test.result).toEqual(
      Cl.ok(
        Cl.tuple({
          "community-mint": Cl.uint(amount),
        })
      )
    );
      if (disp && 'value' in test.result) {console.log("communityMint:", test.result.value)}
  }
}

export function emissionMint(
  sender: any,
  epoch: number,
  amount: number,
  epochs: number,
  disp: boolean
  ){
  const test = simnet.callPublicFn(
    "street-token",
    "emission-mint",
    [],
    sender
  );
  if (epoch >= epochs) {
    expect(test.result).toEqual(Cl.error(Cl.uint(903)));
    return
  } else {
    if (disp) {
      const testObj = (test.result as any).value.value;
      console.log(`emission-mint #${epoch + 1}:`, {
        "emission-block": testObj["emission-block"].value,
        "emission-epoch": testObj["emission-epoch"].value,
        "emission-mint": testObj["emission-mint"].value,
      });
    }
  }
}

export function lockLiquidity(
  sender: any,
  welsh: number,
  disp: boolean
  ){
  const street = welsh * INITIAL_RATIO;
  const test = simnet.callPublicFn( 
      "exchange",
      "lock-liquidity",
      [Cl.uint(welsh)],
      sender);
  expect(test.result).toEqual(
  Cl.ok(
      Cl.tuple({
      "locked-a": Cl.uint(welsh),
      "locked-b": Cl.uint(street),
      })
    )
  )
  if (disp && 'value' in test.result){console.log("lockLiquidity:", test.result.value)}
}

export function mineBurnBlock(
  block: number,
  disp: boolean
  ){
  const test = simnet.mineEmptyBurnBlock();
  
  expect(test).toBeDefined();
  if (disp){
    console.log("Mine Empty Burn Block:", test);
    console.log(`Mined empty burn block #${block}`);
  } 
}

export function provideLiquidity(
  sender: any,
  amountA: number,
  reserveA: number,
  reserveB: number,
  tolerance: number,
  disp: boolean
  ){
    const amountB = Math.floor((amountA * reserveB) / reserveA);
    const amountLp = Math.floor(Math.sqrt(amountA * amountB));
    const test = simnet.callPublicFn( 
      "exchange",
      "provide-liquidity",
      [Cl.uint(amountA)],
      sender);
    if (reserveA == 0 || reserveB == 0){
        expect(test.result).toEqual(Cl.error(Cl.uint(603)))
        if (disp && 'value' in test.result){console.log("providedLiquidity:", test.result.value)}
        return 0
    }
    if (reserveA > 0 && reserveB > 0){
      const result = test.result as any
      const actualObj = result.value.value;
      const actual = {
        amountA: Number(actualObj["added-a"].value),
        amountB: Number(actualObj["added-b"].value),
        amountLp: Number(actualObj["minted-lp"].value),
      };
      const expected = { 
        amountA, 
        amountB, 
        amountLp };
      const difference = {
        amountA: Math.abs(actual.amountA - amountA) / amountA * FEE_BASIS,
        amountB: Math.abs(actual.amountB - amountB) / amountB * FEE_BASIS,
        amountLp: Math.abs(actual.amountLp - amountLp) / amountLp * FEE_BASIS,
      }
      if (disp) {
        console.log("=== Provide LP Results with tolerance ===");
        console.log("Actual:", actual);
        console.log("Expect:", expected);
        console.log("Differ:", difference);
      }
      type SwapKey = keyof typeof expected; 
      (Object.keys(expected) as SwapKey[]).forEach(key => {
        const allowedDiff = Math.floor(Math.abs(expected[key]) * tolerance / FEE_BASIS);
        expect(difference[key]).toBeLessThanOrEqual(allowedDiff);
      });
      if (disp && 'value' in test.result){console.log("providedLiquidity:", test.result.value)}
    return BigInt(amountLp)
  }
  return 0;
}

export function removeLiquidity(
  sender: any,
  amountLp: number,
  userLp: number,
  taxLp: number,
  expectedA: number,
  expectedB: number,
  disp: boolean,
  ){
    const test = simnet.callPublicFn( 
    "exchange",
    "remove-liquidity",
    [Cl.uint(amountLp)],
    sender);
  expect(test.result).toEqual(
    Cl.ok(
      Cl.tuple({
        "burned-lp": Cl.uint(userLp),
        "taxed-lp": Cl.uint(taxLp),
        "user-a": Cl.uint(expectedA),
        "user-b": Cl.uint(expectedB),
      })
    )
  );
  if (disp && 'value' in test.result){
    console.log("removeLiquidity", test.result.value);}
}

export function swapABcalcs(
  amountA: number,
  reserveA: number,
  reserveB: number,
  slipMax: number,
  disp: boolean,
  ){
  let exp = Math.floor((amountA * reserveB) / reserveA); // Expected output (no fees)
  let fee = 50; // 0.5% fee
  let percentA = amountA / reserveA; // Percentage of A input relative to reserves
  // A-side fee calculation
  let feeA = Math.floor((amountA * fee) / FEE_BASIS);
  let amountAnet = amountA - feeA;
  let rewardA = Math.floor(feeA / 2); // Half of fee goes to rewards
  // AMM calculation with net input
  let amountAWithFee = amountAnet * (FEE_BASIS - fee);
  let num = amountAWithFee * reserveB;
  let den = (reserveA * FEE_BASIS) + amountAWithFee;
  let amountB = Math.floor(num / den);
  // B-side fee calculation
  let feeB = Math.floor((amountB * fee) / FEE_BASIS);
  let amountBnet = amountB - feeB;
  let rewardB = Math.floor(feeB / 2); // Half of fee goes to rewards
  // Slippage calculation
  let slip = Math.floor(((exp - amountB) * FEE_BASIS) / exp);
  let minB = Math.floor((amountB * (FEE_BASIS - slipMax)) / FEE_BASIS);
  if (disp) {
    console.log("=== SWAP A B CALCULATIONS ===");
    console.log("amountA:", amountA);
    console.log("reserveA:", reserveA);
    console.log("reserveB:", reserveB);
    console.log("exp:", exp);
    console.log("fee:", fee);
    console.log("feeA:", feeA);
    console.log("amountAnet:", amountAnet);
    console.log("rewardA:", rewardA);
    console.log("amountAWithFee:", amountAWithFee);
    console.log("num:", num);
    console.log("den:", den);
    console.log("amountB:", amountB);
    console.log("feeB:", feeB);
    console.log("amountBnet:", amountBnet);
    console.log("rewardB:", rewardB);
    console.log("slip:", slip);
    console.log("minB:", minB);
    console.log("percentA:", percentA);
  }
  return { amountBnet, feeA, feeB, rewardA, rewardB, slip }
}

export function swapAB(
  sender: any,
  amountA: number,
  slip: number,
  slipMax: number,
  amountBnet: number,
  feeA: number,
  feeB: number,
  tolerance: number,
  disp: boolean
  ){
  const test = simnet.callPublicFn(
    "exchange",
    "swap-a-b",
    [
      Cl.uint(amountA),
      Cl.uint(slipMax),
    ],
    sender);
  if (slip <= slipMax) {
    const actualObj = (test.result as any).value.value
    const actual = {
      amountA: Number(actualObj["amount-a"].value),
      amountBnet: Number(actualObj["amount-b-net"].value),
      feeA: Number(actualObj["fee-a"].value),
      feeB: Number(actualObj["fee-b"].value),
    };
    const expected = { 
      amountA, 
      amountBnet, 
      feeA, 
      feeB };
    const differ = {
      amountA: Math.abs(actual.amountA - amountA) / amountA * FEE_BASIS,
      amountBnet: Math.abs(actual.amountBnet - amountBnet) / amountBnet * FEE_BASIS,
      feeA: Math.abs(actual.feeA - feeA) / feeA * FEE_BASIS,
      feeB: Math.abs(actual.feeB - feeB) / feeB * FEE_BASIS,
    }
    if (disp) {
      console.log("=== SwapAB Results with tolerance ===");
      console.log("Actual:", actual);
      console.log("Expect:", expected);
      console.log("Differ:", differ);
    }
    type SwapKey = keyof typeof expected; 
    (Object.keys(expected) as SwapKey[]).forEach(key => {
      const allowedDiff = Math.floor(Math.abs(expected[key]) * tolerance / FEE_BASIS);
      expect(differ[key]).toBeLessThanOrEqual(allowedDiff);
  });
  } else {
    expect(test.result).toEqual(
      Cl.error(Cl.uint(604))
    );
    if (disp) {console.log("ERR_SLIPPAGE_EXCEEDED:", Cl.uint(604))}
  }
}

export function swapBAcalcs(
  amountB: number,
  reserveA: number,
  reserveB: number,
  slipMax: number,
  disp: boolean,
  ){
  let exp = Math.floor((amountB * reserveA) / reserveB); // Expected output (no fees)
  let fee = 50; // 0.5% fee
  let percentB = amountB / reserveB; // Percentage of B input relative to reserves
  // B-side fee calculation
  let feeB = Math.floor((amountB * fee) / FEE_BASIS);
  let amountBNet = amountB - feeB;
  let rewardB = Math.floor(feeB / 2); // Half of fee goes to rewards
  // AMM calculation with net input
  let amountBWithFee = amountBNet * (FEE_BASIS - fee);
  let num = amountBWithFee * reserveA;
  let den = (reserveB * FEE_BASIS) + amountBWithFee;
  let amountA = Math.floor(num / den);
  // A-side fee calculation
  let feeA = Math.floor((amountA * fee) / FEE_BASIS);
  let amountAnet = amountA - feeA;
  let rewardA = Math.floor(feeA / 2); // Half of fee goes to rewards
  // Slippage calculation
  let slip = Math.floor(((exp - amountA) * FEE_BASIS) / exp);
  let minA = Math.floor((amountA * (FEE_BASIS - slipMax)) / FEE_BASIS);
  if (disp) {
    console.log("=== SWAP B A CALCULATIONS ===");
    console.log("amountB:", amountB);
    console.log("reserveA:", reserveA);
    console.log("reserveB:", reserveB);
    console.log("exp:", exp);
    console.log("fee:", fee);
    console.log("feeB:", feeB);
    console.log("amountBNet:", amountBNet);
    console.log("rewardB:", rewardB);
    console.log("amountBWithFee:", amountBWithFee);
    console.log("num:", num);
    console.log("den:", den);
    console.log("amountA:", amountA);
    console.log("feeA:", feeA);
    console.log("amountAnet:", amountAnet);
    console.log("rewardA:", rewardA);
    console.log("slip:", slip);
    console.log("minA:", minA);
    console.log("percentB:", percentB);
  }
  return { amountAnet, feeA, feeB, rewardA, rewardB, slip }
}

export function swapBA(
  sender: any,
  amountB: number,
  slip: number,
  slipMax: number,
  amountAnet: number,
  feeA: number,
  feeB: number,
  tolerance: number,
  disp: boolean
  ){
  const test = simnet.callPublicFn(
    "exchange",
    "swap-b-a",
    [
      Cl.uint(amountB),
      Cl.uint(slipMax),
    ],
    sender);
  if (slip <= slipMax) {
    const actualObj = (test.result as any).value.value
    const actual = {
      amountAnet: Number(actualObj["amount-a-net"].value),
      amountB: Number(actualObj["amount-b"].value),
      feeA: Number(actualObj["fee-a"].value),
      feeB: Number(actualObj["fee-b"].value),
    };
    const expected = { 
      amountAnet, 
      amountB, 
      feeA, 
      feeB };
    const differ = {
      amountAnet: Math.abs(actual.amountAnet - amountAnet) / amountAnet * FEE_BASIS,
      amountB: Math.abs(actual.amountB - amountB) / amountB * FEE_BASIS,
      feeA: Math.abs(actual.feeA - feeA) / feeA * FEE_BASIS,
      feeB: Math.abs(actual.feeB - feeB) / feeB * FEE_BASIS,
    }
    if (disp){
      console.log("=== SwapAB Results with tolerance ===");
      console.log("Actual:", actual);
      console.log("Expect:", expected);
      console.log("Differ:", differ);
    }
    type SwapKey = keyof typeof expected; 
    (Object.keys(expected) as SwapKey[]).forEach(key => {
      const allowedDiff = Math.floor(Math.abs(expected[key]) * tolerance / FEE_BASIS);
      expect(differ[key]).toBeLessThanOrEqual(allowedDiff);
  });
  } else {
    expect(test.result).toEqual(
      Cl.error(Cl.uint(604))
    );
    if (disp) {console.log("ERR_SLIPPAGE_EXCEEDED:", Cl.uint(604))}
  }
}

export function trackBalances(
  initA: number,
  initB: number,
  updateA: number,
  updateB: number,
  disp: boolean
  ){
    let balanceA = initA + updateA;
    let balanceB = initB + updateB;
    if (disp){
      console.log("Balances A:", balanceA, "Balances B:", balanceB);
    }
    return { balanceA, balanceB }
}  

export function trackReserves(
  initA: number,
  initB: number,
  updateA: number,
  updateB: number,
  disp: boolean
  ){
    let reserveA = initA + updateA;
    let reserveB = initB + updateB;
    if (disp){
      console.log("Reserves A:", reserveA, "Reserves B:", reserveB);
    }
    return { reserveA, reserveB }
}   

export function trackRewards(
  initA: number,
  initB: number,
  updateA: number,
  updateB: number,
  disp: boolean
  ){
    let rewardAccA = initA + updateA;
    let rewardAccB = initB + updateB;
    if (disp){
      console.log("Rewards A:", rewardAccA, "Rewards B:", rewardAccB);
    }
    return { rewardAccA, rewardAccB }
}   

export function transfer(
  token: string,
  sender: any,
  recipient: any,
  amount: number,
  disp: boolean
  ){
  const test = simnet.callPublicFn(
    token,
    "transfer",
    [
      Cl.uint(amount),
      Cl.standardPrincipal(sender),
      Cl.standardPrincipal(recipient),
      Cl.none(),
    ],
    sender);
  expect(test.result).toBeOk(Cl.bool(true));
  if (disp) {console.log("transfer:", token, test.result)} 
}

export function getBalance(
  sender: any,
  token: string,
  amount: number,
  tolerance: number, // 1 = 0.01%
  disp: boolean,
  ){
  let principal, caller;
  if (sender.address && sender.contractName) {
    principal = Cl.contractPrincipal(sender.address, sender.contractName);
    caller = sender.address;
  } else {
    principal = Cl.standardPrincipal(sender);
    caller = sender;
  }
  const balance = simnet.callReadOnlyFn(
    token,
    "get-balance",
    [principal],
    caller
  );
  if (disp) {console.log("--- getBalance ---")}
  if (typeof tolerance === "number" && tolerance > 0) {
    const actual = Number((balance.result as any).value.value);
    const allowedDiff = Math.floor((amount * tolerance) / FEE_BASIS); // 1 bps = 0.01%
    const differ = Math.abs(actual - amount);
    const printBalance = sender.contractName
      ? {
          contract: sender.contractName,
          token,
          actual,
          expect: amount,
          differ,
          allowedDiff,
          tolerance,
        }
      : {
          token,
          actual,
          expect: amount,
          differ,
          allowedDiff,
          tolerance,
        };
    if (disp) {
      console.log(
        `${caller.slice(-4)}:`,
        printBalance
      );
    }
    expect(differ).toBeLessThanOrEqual(allowedDiff);
  } else {
    if (disp) {
      const actual = Number((balance.result as any)?.value?.value ?? NaN);
      const printBalance = sender.contractName
        ? {
            contract: sender.contractName,
            token,
            actual,
            expect: amount,
          }
        : {
            token,
            actual,
            expect: amount,
          };
      console.log(
        `${caller.slice(-4)}:`,
        printBalance
      );
    }
    expect(balance.result).toBeOk(Cl.uint(amount));
  }
}

export function getCommunityMinted(
  sender: any,
  minted: number,
  disp: boolean,
  ){
  const test = simnet.callReadOnlyFn(
    "street-token",
    "get-community-minted",
    [],
    sender);
    expect(test.result).toBeOk(Cl.uint(minted))
    if (disp && 'value' in test.result){console.log("communityMinted:",test.result.value)}
}

export function getCurrentEpoch(
  sender: any,
  epoch: number,
  disp: boolean,
  ){
  const test = simnet.callReadOnlyFn(
    "street-token",
    "get-current-epoch",
    [],
    sender);
    expect(test.result).toBeOk(Cl.uint(epoch))
    if (disp && 'value' in test.result){console.log("currentEpoch:",test.result.value)}
    return (test.result as any).value.value
}

export function getDecimals(
  sender: any,
  token: string,
  decimal: number,
  disp: boolean
  ){
  const test = simnet.callReadOnlyFn(
    token,
    "get-decimals",
    [],
    sender
  );
  expect(test.result).toBeOk(Cl.uint(decimal));
  if (disp && 'value' in test.result) {
    console.log("getDecimals:", test.result.value);
  }
}

export function getName(
  sender: any,
  token: string,
  name: string,
  disp: boolean
  ){
  const test = simnet.callReadOnlyFn(
    token,
    "get-name",
    [],
    sender
  );
  expect(test.result).toBeOk(Cl.stringAscii(name));
  if (disp && 'value' in test.result) {
    console.log("getName:", test.result.value);
  }
}

export function getRewardPoolInfo(
  sender: any,
  rewardsA: number,
  rewardsB: number,
  shareA: number,
  shareB: number,
  disp: boolean
  ){
  const test = simnet.callReadOnlyFn(
    "rewards",
    "get-reward-pool-info",
    [],
    sender
  );
  const actualObj = (test.result as any).value.value
  const actual = {
    rewardsA: Number(actualObj["rewards-a"].value),
    rewardsB: Number(actualObj["rewards-b"].value),
    shareA: Number(actualObj["share-a"].value),
    shareB: Number(actualObj["share-b"].value),
  };
  const expected = { rewardsA, rewardsB, shareA, shareB };
  const differ = {
    rewardsA: Math.abs(actual.rewardsA - rewardsA),
    rewardsB: Math.abs(actual.rewardsB - rewardsB),
    shareA: Math.abs(actual.shareA - shareA),
    shareB: Math.abs(actual.shareB - shareB),
  };
  if (disp) {     
  console.log("--- getRewardPoolInfo ---");
  console.log("Actual:", actual);
  console.log("Expect:", expected);
  console.log("Differ:", differ);
  }
  expect(test.result).toBeOk(
    Cl.tuple({
      "rewards-a": Cl.uint(rewardsA),
      "rewards-b": Cl.uint(rewardsB),
      "share-a": Cl.uint(shareA),
      "share-b": Cl.uint(shareB),
    })
  );
  if (disp && 'value' in test.result) {
    console.log("getRewardPoolInfo:", test.result.value);
  }
}

export function getRewardUserInfo(
  sender: any,
  user: string,
  amountLp: bigint,
  rewardAccA: number,
  rewardAccB: number,
  debtA: number,
  debtB: number,
  unclaimedA: number,
  unclaimedB: number,
  tolerance: number,
  disp: boolean
  ){
  const test = simnet.callReadOnlyFn(
    "rewards",
    "get-reward-user-info",
    [Cl.standardPrincipal(user)],
    sender
  );
  const actualObj = (test.result as any).value.value
  const actual = {
    amountLp: BigInt(actualObj["amount-lp"].value),
    rewardAccA: Number(actualObj["reward-acc-a"].value),
    rewardAccB: Number(actualObj["reward-acc-b"].value),
    debtA: Number(actualObj["debt-a"].value),
    debtB: Number(actualObj["debt-b"].value),
    unclaimedA: Number(actualObj["unclaimed-a"].value),
    unclaimedB: Number(actualObj["unclaimed-b"].value),
  };
  const expected = { 
    amountLp, 
    rewardAccA, 
    rewardAccB, 
    debtA, 
    debtB, 
    unclaimedA, 
    unclaimedB };
  const nanDiff = (actual: number | bigint, expected: number | bigint) => {
    const numActual = typeof actual === "bigint" ? Number(actual) : actual;
    const numExpected = typeof expected === "bigint" ? Number(expected) : expected;
    if (numExpected === 0) return 0;
    const allowedDiff = Math.abs(numActual - numExpected) / numExpected * FEE_BASIS;
    return isNaN(allowedDiff) ? 0 : allowedDiff;
  };
  const differ = {
    amountLp: nanDiff(actual.amountLp, amountLp),
    rewardAccA: nanDiff(actual.rewardAccA, rewardAccA),
    rewardAccB: nanDiff(actual.rewardAccB, rewardAccB),
    debtA: nanDiff(actual.debtA, debtA),
    debtB: nanDiff(actual.debtB, debtB),
    unclaimedA: nanDiff(actual.unclaimedA, unclaimedA),
    unclaimedB: nanDiff(actual.unclaimedB, unclaimedB),
  };
  if (disp) {
    console.log("--- getRewardUserInfo ---");
    console.log("Actual:", actual);
    console.log("Expect:", expected);
    console.log("Differ:", differ);
  }
  type RewardKey = keyof typeof expected;
  (Object.keys(expected) as RewardKey[]).forEach(key => {
    const expectedVal = typeof expected[key] === "bigint" ? Number(expected[key]) : expected[key];
    const allowedDiff = Math.floor(Math.abs(expectedVal) * tolerance / FEE_BASIS);
    expect(differ[key]).toBeLessThanOrEqual(allowedDiff);
    });
}

export function getSymbol(
  sender: any,
  token: string,
  symbol: string,
  disp: boolean
  ){
  const test = simnet.callReadOnlyFn(
    token,
    "get-symbol",
    [],
    sender
  );
  expect(test.result).toBeOk(Cl.stringAscii(symbol));
  if (disp && 'value' in test.result) {
    console.log("getSymbol:", test.result.value);
  }
}

export function getTokenUri(
  sender: any,
  token: string,
  uri: any,
  disp: boolean
  ){
  const test = simnet.callReadOnlyFn(
    token,
    "get-token-uri",
    [],
    sender
  );
  expect(test.result).toBeOk(Cl.some(Cl.stringUtf8(uri)));
  if (disp && 'value' in test.result) {
    console.log("getTokenUri:", test.result.value);
  }
}

export function getTotalSupply(
  sender: any,
  token: string,
  totalSupply: bigint,
  disp: boolean
  ){
  const test = simnet.callReadOnlyFn(
    token,
    "get-total-supply",
    [],
    sender
  );
  const actual = BigInt((test.result as any).value.value);
  const expect = totalSupply
  const differ = Math.abs(Number(actual - expect)) / Number(actual) * FEE_BASIS;
  if (disp && 'value' in test.result) {
    console.log({
      "Actual:": actual,
      "Expect:": expect,
      "Differ:": differ,
    });
  }
  return actual
}

// === ARCHIVE AI IGNORE ALL FUNCTIONS UNDER THIS COMMENT ===
// export function provideLiquidityTuple(
//   sender: any,
//   welsh: number,
//   reserveA: number,
//   reserveB: number,
//   disp: boolean
//   ){
//     const street = Math.floor((welsh * reserveB) / reserveA);
//     const cred = Math.floor(Math.sqrt(welsh * street));
//     const liquidity = simnet.callPublicFn( 
//       "exchange",
//       "provide-liquidity",
//       [Cl.uint(welsh)],
//       sender);
//     if (reserveA == 0 || reserveB == 0){
//         expect(test.result).toEqual(Cl.error(Cl.uint(603)))
//         if (disp && 'value' in test.result){console.log("providedLiquidity:", test.result.value)}
//         return
//     }
//     if (reserveA > 0 && reserveB > 0){
//     expect(test.result).toEqual(
//     Cl.ok(
//         Cl.tuple({
//         "added-a": Cl.uint(welsh),
//         "added-b": Cl.uint(street),
//         "minted-lp": Cl.uint(cred)
//         })
//         )
//     )
//     if (disp && 'value' in test.result){console.log("providedLiquidity:", test.result.value)}
//   }
// }

// export function swapBAtuple(
//   sender: any,
//   amountB: number,
//   slip: number,
//   slipMax: number,
//   amountAnet: number,
//   feeA: number,
//   feeB: number,
//   disp: boolean
//   ){
//   const swap = simnet.callPublicFn(
//     "exchange",
//     "swap-b-a",
//     [
//       Cl.uint(amountB),
//       Cl.uint(slipMax),
//     ],
//     sender);

//   if (slip <= slipMax) {
//     expect(test.result).toEqual(
//       Cl.ok(
//         Cl.tuple({
//           "a-out-net": Cl.uint(amountAnet),
//           "b-in": Cl.uint(amountB), 
//           "fee-a": Cl.uint(feeA), 
//           "fee-b": Cl.uint(feeB), 
//         })
//       )
//     );
//   } else {
//     expect(test.result).toEqual(
//       Cl.error(Cl.uint(604))
//     );
//     if (disp) {console.log("ERR_SLIPPAGE_EXCEEDED:", Cl.uint(604))}
//   }
// }