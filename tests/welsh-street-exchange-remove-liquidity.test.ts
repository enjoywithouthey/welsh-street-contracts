import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;
const disp = true;

describe("exchange provide liquidity", () => {
  it("wallet1 provides lp, transfers half to wallet2, wallet2 removes lp", () => {
    // STEP 1 - Mint Street
    const communityMint = simnet.callPublicFn(
      "street-token",
      "community-mint",
      [],
      deployer
    );
    expect(communityMint.result).toEqual(
      Cl.ok(
        Cl.tuple({
          "community-mints-remaining": Cl.uint(3),
          "circulating-supply": Cl.uint(1000000000000000),
        })
      )
    );
    if (disp) {console.log("communityMint:", JSON.stringify(communityMint.result, null, 2))}

    // Initial reserves and LP
    const INITIAL_WELSH = 1000000;
    const INITIAL_STREET = INITIAL_WELSH * 100;
    const INITIAL_LP = Math.floor(Math.sqrt(INITIAL_WELSH * INITIAL_STREET));

    // STEP 2 - Deployer provides initial liquidity
    const initialLiquidityPass = simnet.callPublicFn(
      "welsh-street-exchange",
      "initial-liquidity",
      [Cl.uint(INITIAL_WELSH)],
      deployer
    );
    expect(initialLiquidityPass.result).toEqual(
      Cl.ok(
        Cl.tuple({
          "added-a": Cl.uint(INITIAL_WELSH),
          "added-b": Cl.uint(INITIAL_STREET),
          "minted-lp": Cl.uint(INITIAL_LP),
        })
      )
    );
    if (disp) {console.log("initialLiquidityPass:", JSON.stringify(initialLiquidityPass.result, null, 2))}
    
    // STEP 3 - deployer transfers 10% of the Welsh and Street to wallet1
    const TRANSFER_WELSH = INITIAL_WELSH * 0.1;
    const transferWelshTowallet1 = simnet.callPublicFn(
      "welshcorgicoin",
      "transfer",
      [
        Cl.uint(TRANSFER_WELSH),
        Cl.standardPrincipal(deployer),
        Cl.standardPrincipal(wallet1),
        Cl.none(),
      ],
      deployer
    );
    expect(transferWelshTowallet1.result).toBeOk(Cl.bool(true));

    const TRANSFER_STREET = TRANSFER_WELSH * 100;
    const transferStreet = simnet.callPublicFn(
      "street-token",
      "transfer",
      [
        Cl.uint(TRANSFER_STREET),
        Cl.standardPrincipal(deployer),
        Cl.standardPrincipal(wallet1),
        Cl.none(),
      ],
      deployer
    );
    expect(transferStreet.result).toBeOk(Cl.bool(true));

    // STEP 4 - wallet1 provides liquidity
    const PROVIDED_WELSH = TRANSFER_WELSH * 0.1;
    const initialResA = INITIAL_WELSH;
    const initialResB = INITIAL_STREET;
    const providedAmountA = PROVIDED_WELSH;
    const providedAmountB = Math.floor((providedAmountA * initialResB) / initialResA);

    // New reserves after wallet1 provides liquidity
    const providedResA = initialResA + providedAmountA;
    const providedResB = initialResB + providedAmountB;

    // LP minted for wallet1's liquidity
    const lpFromA = Math.floor((providedAmountA * INITIAL_LP) / initialResA);
    const lpFromB = Math.floor((providedAmountB * INITIAL_LP) / initialResB);
    const providedLp = Math.min(lpFromA, lpFromB);

    const wallet1ProvideLiquidityPass = simnet.callPublicFn(
      "welsh-street-exchange",
      "provide-liquidity",
      [Cl.uint(providedAmountA)],
      wallet1
    );
    expect(wallet1ProvideLiquidityPass.result).toEqual(
      Cl.ok(
        Cl.tuple({
          "added-a": Cl.uint(providedAmountA),
          "added-b": Cl.uint(providedAmountB),
          "minted-lp": Cl.uint(providedLp),
        })
      )
    );
    if (disp) {console.log("wallet1ProvideLiquidityPass:", JSON.stringify(wallet1ProvideLiquidityPass.result, null, 2))}

    // STEP 5 - wallet1 transfers the lp tokens to wallet2
    const TRANSFER_FACTOR = 1 // 1 means all of it
    const TRANSFER_LP = providedLp * TRANSFER_FACTOR
    const userTransferPass = simnet.callPublicFn(
      "welsh-street-liquidity",
      "transfer",
      [
        Cl.uint(TRANSFER_LP),
        Cl.standardPrincipal(wallet1),
        Cl.standardPrincipal(wallet2),
        Cl.none(),
      ],
      wallet1
    );
    expect(userTransferPass.result).toBeOk(Cl.bool(true));

    // STEP 6 - deployer transfers Welsh and Street to the transformer contract so when wallet2 removes liquidity, the transformer has enough weslh and street to send to the user. 
    const transferWelshToTransformerBeforeRemoveLiquidity = simnet.callPublicFn(
    "welshcorgicoin",
    "transfer",
    [
        Cl.uint(TRANSFER_WELSH), // or a large enough value to cover amount-a
        Cl.standardPrincipal(deployer),
        Cl.contractPrincipal(deployer, "welsh-street-transformer"),
        Cl.none(),
    ],
    deployer);
    expect(transferWelshToTransformerBeforeRemoveLiquidity.result).toBeOk(Cl.bool(true));

    const transferStreetToTransformerBeforeRemoveLiquidity= simnet.callPublicFn(
    "street-token",
    "transfer",
    [
        Cl.uint(TRANSFER_STREET), 
        Cl.standardPrincipal(deployer),
        Cl.contractPrincipal(deployer, "welsh-street-transformer"),
        Cl.none(),
    ],
    deployer);
    expect(transferStreetToTransformerBeforeRemoveLiquidity.result).toBeOk(Cl.bool(true));

    const exchangeWelshBalanceBeforeRemove = simnet.callReadOnlyFn( //balance reponse
      "welshcorgicoin",
      "get-balance",
      [ Cl.contractPrincipal(deployer, "welsh-street-exchange")],
      deployer
    );
    expect(exchangeWelshBalanceBeforeRemove.result).toBeOk(Cl.uint(INITIAL_WELSH + PROVIDED_WELSH));
    if (disp) {console.log("exchangeWelshBalanceBeforeRemove", JSON.stringify(exchangeWelshBalanceBeforeRemove.result, null, 2))}

    const exchangeStreetBalanceBeforeRemove = simnet.callReadOnlyFn( //balance reponse
      "street-token",
      "get-balance",
      [ Cl.contractPrincipal(deployer, "welsh-street-exchange")],
      deployer
    );
    expect(exchangeStreetBalanceBeforeRemove.result).toBeOk(Cl.uint(INITIAL_STREET + providedAmountB));
    if (disp) {console.log("exchangeStreetBalanceBeforeRemove", JSON.stringify(exchangeStreetBalanceBeforeRemove.result, null, 2))}

    const wallet2LiquidityBalanceBeforeRemove = simnet.callReadOnlyFn( //balance reponse
      "welsh-street-liquidity",
      "get-balance",
      [ Cl.standardPrincipal(wallet2)],
      wallet2
    );
    expect(wallet2LiquidityBalanceBeforeRemove.result).toBeOk(Cl.uint(providedLp));
    if (disp) {console.log("exchangeLiquidityBalanceBeforeRemove", JSON.stringify(wallet2LiquidityBalanceBeforeRemove.result, null, 2))}

    const wallet2RemoveLiquidity = simnet.callPublicFn(
      "welsh-street-exchange",
      "remove-liquidity",
      [Cl.uint(TRANSFER_LP)],
      wallet2
    );
return
    const REMOVE_LP = providedLp;
    const taxLp = Math.floor(REMOVE_LP * 0.1); // 10% tax
    const userLp = REMOVE_LP - taxLp;
    const reserveA = providedResA; // 1,010,000
    const reserveB = providedResB; // 101,000,000
    const lpSupply = INITIAL_LP + providedLp; // 10,000,000 + 100,000 = 10,100,000

    // For this test, let's use the reserves after wallet1 provides
    // So, reserveA = 100100, reserveB = 10010000, lpSupply = 1001000000000

    const expectedA = Math.floor((userLp * reserveA) / lpSupply);
    const expectedB = Math.floor((userLp * reserveB) / lpSupply);
    if (disp) {console.log("expectedA", expectedA)}
    if (disp) {console.log("expectedB", expectedB)}

    expect(wallet2RemoveLiquidity.result).toEqual(
      Cl.ok(
        Cl.tuple({
          "burned-lp": Cl.uint(userLp),
          "taxed-lp": Cl.uint(taxLp),
          "user-a": Cl.uint(expectedA),
          "user-b": Cl.uint(expectedB),
        })
      )
    );
    if (disp) {console.log("wallet2RemoveLiquidity", JSON.stringify(wallet2RemoveLiquidity.result, null, 2))}

    const exchangeWelshBalanceAfterRemove = simnet.callReadOnlyFn( //balance reponse
      "welshcorgicoin",
      "get-balance",
      [ Cl.contractPrincipal(deployer, "welsh-street-exchange")],
      deployer
    );
    expect(exchangeWelshBalanceAfterRemove.result).toBeOk(Cl.uint(100100));
    if (disp) {console.log("exchangeWelshBalanceAfterRemove", JSON.stringify(exchangeWelshBalanceAfterRemove.result, null, 2))}

    const exchangeStreetBalanceAfterRemove = simnet.callReadOnlyFn( //balance reponse
      "street-token",
      "get-balance",
      [ Cl.contractPrincipal(deployer, "welsh-street-exchange")],
      deployer
    );
    expect(exchangeStreetBalanceAfterRemove.result).toBeOk(Cl.uint(10010000));
    if (disp) {console.log("exchangeStreetBalanceAfterRemove", JSON.stringify(exchangeStreetBalanceAfterRemove.result, null, 2))}

    const wallet2WelshBalanceAfterRemove = simnet.callReadOnlyFn( //balance reponse
      "welshcorgicoin",
      "get-balance",
      [ Cl.standardPrincipal(wallet2)],
      wallet2
    );
    expect(wallet2WelshBalanceAfterRemove.result).toBeOk(Cl.uint(90));
    if (disp) {console.log("exchangeWelshBalanceAfterRemove", JSON.stringify(wallet2WelshBalanceAfterRemove.result, null, 2))}

    const wallet2StreetBalanceAfterRemove = simnet.callReadOnlyFn( //balance reponse
      "street-token",
      "get-balance",
      [ Cl.standardPrincipal(wallet2)],
      wallet2
    );
    expect(wallet2StreetBalanceAfterRemove.result).toBeOk(Cl.uint(9000));
    if (disp) {console.log("wallet2StreetBalanceAfterRemove", JSON.stringify(wallet2StreetBalanceAfterRemove.result, null, 2))}
  });
});