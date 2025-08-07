import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";
import { disp, COMMUNITY_MINT_CAP } from "../vitestconfig"

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;

const COMMUNITY_MINT_AMOUNT = 1000000000000000

const INITIAL_WELSH = 1000000;
const INITIAL_STREET = INITIAL_WELSH * 100;
const INITIAL_LP = Math.floor(Math.sqrt(INITIAL_WELSH * INITIAL_STREET));

describe("exchange initial liquidity", () => {
  it("fund wallet 1 to swap - confirm all balances", () => {
    // STEP 1 - Mint Street

    const communityMint = simnet.callPublicFn(
      "street-token",
      "community-mint",
      [Cl.uint(COMMUNITY_MINT_AMOUNT)],
      deployer
    );

    let circulatingSupply = 0;
    let communityMinted = 0;

    circulatingSupply = circulatingSupply + COMMUNITY_MINT_AMOUNT;
    communityMinted = communityMinted + COMMUNITY_MINT_AMOUNT;

    expect(communityMint.result).toEqual(
    Cl.ok(
      Cl.tuple({
        "community-mint-remaining": Cl.uint(COMMUNITY_MINT_CAP - communityMinted),
        "circulating-supply": Cl.uint(circulatingSupply),
        })
      )
    );
    if (disp) {console.log("communityMint:", JSON.stringify(communityMint.result, null, 2))}
    if (disp) {console.log("circulatingSupply: ",circulatingSupply)}
    if (disp) {console.log("communityMinted: ", communityMinted)}

    // STEP 2 - Provide Initial Liquidity


    const initialLiquidity = simnet.callPublicFn( 
      "welsh-street-exchange",
      "initial-liquidity",
      [Cl.uint(INITIAL_WELSH)],
      deployer);
    expect(initialLiquidity.result).toEqual(
    Cl.ok(
      Cl.tuple({
        "added-a": Cl.uint(INITIAL_WELSH),
        "added-b": Cl.uint(INITIAL_STREET),
        "minted-lp": Cl.uint(INITIAL_LP)
        })
      )
    )
    if (disp) {console.log("initialLiquidity:", JSON.stringify(initialLiquidity.result, null, 2))}

    const initialLiquidityWelshBalance = simnet.callReadOnlyFn(
      "welshcorgicoin",
      "get-balance",
      [Cl.contractPrincipal(deployer, "welsh-street-exchange")],
      deployer);
      expect(initialLiquidityWelshBalance.result).toBeOk(Cl.uint(INITIAL_WELSH));
      if (disp) {console.log("initialLiquidityWelshBalance:", Cl.uint(INITIAL_WELSH))}
      
    const initialLiquidityStreetBalance = simnet.callReadOnlyFn(
      "street-token",
      "get-balance",
      [Cl.contractPrincipal(deployer, "welsh-street-exchange")],
      deployer);
      expect(initialLiquidityStreetBalance.result).toBeOk(Cl.uint(INITIAL_STREET));
      if (disp) {console.log("initialLiquidityStreetBalance:", Cl.uint(INITIAL_STREET))}
        
    const initialLiquidityCredBalance = simnet.callReadOnlyFn(
      "welsh-street-liquidity",
      "get-balance",
      [Cl.contractPrincipal(deployer, "welsh-street-exchange")],
      deployer);
      expect(initialLiquidityCredBalance.result).toBeOk(Cl.uint(INITIAL_LP));
      if (disp) {console.log("initialLiquidityBalance:", Cl.uint(INITIAL_LP))}

    // STEP 3 - Transfer Welsh wallet1
    const WELSH_TRANSFER = 1000000;
    
    const welshTransfer = simnet.callPublicFn(
      "welshcorgicoin",
      "transfer",
      [
        Cl.uint(WELSH_TRANSFER),
        Cl.standardPrincipal(deployer),
        Cl.standardPrincipal(wallet1),
        Cl.none(),
      ],
      deployer);
    expect(welshTransfer.result).toBeOk(Cl.bool(true));

    const welshTransferBalance = simnet.callReadOnlyFn(
      "welshcorgicoin",
      "get-balance",
      [Cl.standardPrincipal(wallet1)],
      wallet1
    );
    expect(welshTransferBalance.result).toBeOk(Cl.uint(WELSH_TRANSFER)); 
    
    // STEP 4 - wallet1 swaps welsh for street

    const WELSH_SWAP = 500000;
    const SLIPPAGE = 4;

    let resA = INITIAL_WELSH;
    let resB = INITIAL_STREET;
    let aIn = WELSH_SWAP;
    let fee = 10; 
    let aFee = Math.floor((aIn * fee) / 1000);
    let aInNet = aIn - aFee; 
    let aInWithFee =  aInNet * 1000; 
    let num = aInWithFee * resB; 
    let den = (resA * 1000) + aInWithFee; console.log("den:", den);
    let bOut = Math.floor(num / den); 
    let minA = Math.floor((bOut * (10000 - SLIPPAGE)) / 10000); 
    let delta = bOut - minA;
    
    if (disp) {
      console.log("fee:", fee);
      console.log("resA:", resA);
      console.log("resB:", resB);
      console.log("aIn:", aIn);
      console.log("aFee:", aFee);
      console.log("aInNet:", aInNet);
      console.log("aInWithFee:", aInWithFee);
      console.log("num:", num);
      console.log("bOut:", bOut);
      console.log("minAcceptable:", minA);
      console.log("delta:", delta)
    }
    
    const welsh2StreetSwap = simnet.callPublicFn(
      "welsh-street-exchange",
      "swap-a-for-b",
      [
        Cl.uint(WELSH_SWAP),
        Cl.uint(SLIPPAGE),
      ],
      wallet1);
    expect(welsh2StreetSwap.result).toEqual(
    Cl.ok(
      Cl.tuple({
          "fee-a": Cl.uint(aFee), 
          "swap-in": Cl.uint(aIn), 
          "swap-out": Cl.uint(Math.floor(bOut))
        })
      )
    )
    if (disp) {console.log("communityMint:", JSON.stringify(welsh2StreetSwap.result, null, 2))}
    
    // STEP 5 - Check balances
    const welsh2StreetSwapBalanceWallet1 = simnet.callReadOnlyFn(
      "welshcorgicoin",
      "get-balance",
      [Cl.standardPrincipal(wallet1)],
      wallet1
    );
    expect(welsh2StreetSwapBalanceWallet1.result).toBeOk(Cl.uint(WELSH_TRANSFER - aIn)); 
  })

  it("wallet 1 swaps with slippage error", () => {
    // STEP 1 - Mint Street

    const communityMint = simnet.callPublicFn(
      "street-token",
      "community-mint",
      [Cl.uint(COMMUNITY_MINT_AMOUNT)],
      deployer
    );

    let circulatingSupply = 0;
    let communityMinted = 0;

    circulatingSupply = circulatingSupply + COMMUNITY_MINT_AMOUNT;
    communityMinted = communityMinted + COMMUNITY_MINT_AMOUNT;

    expect(communityMint.result).toEqual(
    Cl.ok(
      Cl.tuple({
        "community-mint-remaining": Cl.uint(COMMUNITY_MINT_CAP - communityMinted),
        "circulating-supply": Cl.uint(circulatingSupply),
        })
      )
    );
    if (disp) {console.log("communityMint:", JSON.stringify(communityMint.result, null, 2))}
    if (disp) {console.log("circulatingSupply: ",circulatingSupply)}
    if (disp) {console.log("communityMinted: ", communityMinted)}

    // STEP 2 - Provide Initial Liquidity
    const initialLiquidity = simnet.callPublicFn( 
      "welsh-street-exchange",
      "initial-liquidity",
      [Cl.uint(INITIAL_WELSH)],
      deployer);
    expect(initialLiquidity.result).toEqual(
    Cl.ok(
      Cl.tuple({
        "added-a": Cl.uint(INITIAL_WELSH),
        "added-b": Cl.uint(INITIAL_STREET),
        "minted-lp": Cl.uint(INITIAL_LP)
        })
      )
    )
    if (disp) {console.log("initialLiquidity:", JSON.stringify(initialLiquidity.result, null, 2))}

    const initialLiquidityWelshBalance = simnet.callReadOnlyFn(
      "welshcorgicoin",
      "get-balance",
      [Cl.contractPrincipal(deployer, "welsh-street-exchange")],
      deployer);
      expect(initialLiquidityWelshBalance.result).toBeOk(Cl.uint(INITIAL_WELSH));
      if (disp) {console.log("initialLiquidityWelshBalance:", Cl.uint(INITIAL_WELSH))}
      
    const initialLiquidityStreetBalance = simnet.callReadOnlyFn(
      "street-token",
      "get-balance",
      [Cl.contractPrincipal(deployer, "welsh-street-exchange")],
      deployer);
      expect(initialLiquidityStreetBalance.result).toBeOk(Cl.uint(INITIAL_STREET));
      if (disp) {console.log("initialLiquidityStreetBalance:", Cl.uint(INITIAL_STREET))}
        
    const initialLiquidityCredBalance = simnet.callReadOnlyFn(
      "welsh-street-liquidity",
      "get-balance",
      [Cl.contractPrincipal(deployer, "welsh-street-exchange")],
      deployer);
      expect(initialLiquidityCredBalance.result).toBeOk(Cl.uint(INITIAL_LP));
      if (disp) {console.log("initialLiquidityBalance:", Cl.uint(INITIAL_LP))}

    // STEP 3 - Transfer Welsh wallet1
    const WELSH_TRANSFER = 1000000;
    
    const welshTransfer = simnet.callPublicFn(
      "welshcorgicoin",
      "transfer",
      [
        Cl.uint(WELSH_TRANSFER),
        Cl.standardPrincipal(deployer),
        Cl.standardPrincipal(wallet1),
        Cl.none(),
      ],
      deployer);
    expect(welshTransfer.result).toBeOk(Cl.bool(true));

    const welshTransferBalance = simnet.callReadOnlyFn(
      "welshcorgicoin",
      "get-balance",
      [Cl.standardPrincipal(wallet1)],
      wallet1
    );

    expect(welshTransferBalance.result).toBeOk(Cl.uint(WELSH_TRANSFER)); 

    // STEP 4 - Set up a large swap amount
    const WELSH_LARGE_SWAP = 100000; // Large relative to reserves
    const MAX_SLIP = 10; // 0.01% slippage tolerance (very strict)
    const FEE_BASIS = 10000;

    // Use the same reserves as initial liquidity
    let aIn = WELSH_LARGE_SWAP;
    let resA = INITIAL_WELSH;
    let resB = INITIAL_STREET;
    let exp = (resB * resA) / resA;
    let fee = 100;
    let aFee = Math.floor((aIn * fee) / FEE_BASIS);
    let aInNet = aIn - aFee;
    let aInWithFee = aInNet - ((aInNet * fee) / FEE_BASIS);
    let num = aInWithFee * resB;
    let den = resA + aInWithFee;
    let bOut = Math.floor(num / den);
    let slip = ((exp - bOut) / exp) * FEE_BASIS
    let minA = Math.floor((bOut * (FEE_BASIS - MAX_SLIP)) / FEE_BASIS);
    let delta = bOut - minA;

    if (disp) {
      console.log("LARGE SWAP TEST");
      console.log("aIn:", aIn);
      console.log("aFee:", aFee);
      console.log("aInNet:", aInNet);
      console.log("bOut:", bOut);
      console.log("slip:", slip)
      console.log("minA:", minA);
      console.log("delta:", delta)

    }

    // STEP 5 - Attempt the swap, expect an error due to slippage
    const largeSwapResult = simnet.callPublicFn(
      "welsh-street-exchange",
      "swap-a-for-b",
      [
        Cl.uint(WELSH_LARGE_SWAP),
        Cl.uint(SLIPPAGE),
      ],
      wallet1
    );

    // The contract should return an error for slippage exceeded
    // (ERR_SLIPPAGE_EXCEEDED is typically u601, update if your contract uses a different code)
    expect(largeSwapResult.result).toEqual(Cl.error(Cl.uint(604)));
    
    if (disp) {
      console.log("bOut:", bOut);
      console.log("minA:", minA);
    }

  })
});
