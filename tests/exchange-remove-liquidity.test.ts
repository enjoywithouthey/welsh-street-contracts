import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";
import { disp,
  COMMUNITY_MINT_AMOUNT,
  COMMUNITY_MINT_CAP,
  INITIAL_WELSH,
  INITIAL_STREET,
  INITIAL_LP
} from "../vitestconfig"

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

describe("exchange provide liquidity", () => {
  it("wallet1 provides lp, transfers half to wallet2, wallet2 removes lp", () => {
    // STEP 1 - Mint Street

    let circulatingSupply = 0;
    let communityMinted = 0;

    const communityMint1 = simnet.callPublicFn(
      "street-token",
      "community-mint",
      [Cl.uint(COMMUNITY_MINT_AMOUNT)],
      deployer
    );

    circulatingSupply = circulatingSupply + COMMUNITY_MINT_AMOUNT;
    communityMinted = communityMinted + COMMUNITY_MINT_AMOUNT;

    expect(communityMint1.result).toEqual(
    Cl.ok(
      Cl.tuple({
        "community-mint-remaining": Cl.uint(COMMUNITY_MINT_CAP - communityMinted),
        "circulating-supply": Cl.uint(circulatingSupply),
        })
      )
    );
    if (disp) {console.log("communityMint:", JSON.stringify(communityMint1.result, null, 2))}
    if (disp) {console.log("circulatingSupply: ",circulatingSupply)}
    if (disp) {console.log("communityMinted: ", communityMinted)}

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
          "minted-lp": Cl.uint(0),
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

    // LP minted for wallet1's liquidity (first LP provision, so use geometric mean)
    const providedLp = Math.floor(Math.sqrt(providedAmountA * providedAmountB));

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

    // STEP 6 - Remove liquidity calculations
    const REMOVE_LP = providedLp;
    const taxLp = Math.floor(REMOVE_LP * 0.1); // 10% tax
    const userLp = REMOVE_LP - taxLp;
    const reserveA = providedResA;
    const reserveB = providedResB;
    const lpSupply = providedLp; // ✅ Only LP tokens from provide-liquidity

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

    const exchangeWelshBalanceAfterRemove = simnet.callReadOnlyFn(
      "welshcorgicoin",
      "get-balance",
      [Cl.contractPrincipal(deployer, "welsh-street-exchange")],
      deployer
    );
    const expectedExchangeWelshAfterRemove = providedResA - expectedA;
    expect(exchangeWelshBalanceAfterRemove.result).toBeOk(Cl.uint(expectedExchangeWelshAfterRemove));

    const exchangeStreetBalanceAfterRemove = simnet.callReadOnlyFn(
      "street-token",
      "get-balance", 
      [Cl.contractPrincipal(deployer, "welsh-street-exchange")],
      deployer
    );
    const expectedExchangeStreetAfterRemove = providedResB - expectedB;
    expect(exchangeStreetBalanceAfterRemove.result).toBeOk(Cl.uint(expectedExchangeStreetAfterRemove));

    const wallet2WelshBalanceAfterRemove = simnet.callReadOnlyFn(
      "welshcorgicoin",
      "get-balance",
      [Cl.standardPrincipal(wallet2)],
      wallet2
    );
    expect(wallet2WelshBalanceAfterRemove.result).toBeOk(Cl.uint(expectedA));

    const wallet2StreetBalanceAfterRemove = simnet.callReadOnlyFn(
      "street-token", 
      "get-balance",
      [Cl.standardPrincipal(wallet2)],
      wallet2
    );
    expect(wallet2StreetBalanceAfterRemove.result).toBeOk(Cl.uint(expectedB));
  });
});