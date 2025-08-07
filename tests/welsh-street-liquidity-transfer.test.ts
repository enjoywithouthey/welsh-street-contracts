import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";
import { disp, COMMUNITY_MINT_CAP } from "../vitestconfig"

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;

describe("liquidity transfers", () => {
  it("transfers LP tokens from exchange to wallet1", () => {

    const COMMUNITY_MINT_AMOUNT = 1000000000000000
    let circulatingSupply = 0;
    let communityMinted = 0;

    const checkWelshBalance = simnet.callReadOnlyFn(
      "welshcorgicoin",
      "get-balance",
      [Cl.standardPrincipal(deployer)],
      deployer);
    expect(checkWelshBalance.result).toEqual(
    Cl.ok(Cl.uint(BigInt(10000000000000000n))));
    if (disp) {console.log("mintbr:", Cl.ok(Cl.uint(BigInt(10000000000000000n))))}

    const communityMint = simnet.callPublicFn(
      "street-token",
      "community-mint",
      [Cl.uint(COMMUNITY_MINT_AMOUNT)],
      deployer);

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

    const INITIAL_WELSH = 1000;
    const INITIAL_STREET = INITIAL_WELSH * 100;
    const mintedCred = Math.floor(Math.sqrt(INITIAL_WELSH * INITIAL_STREET));
    
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
        "minted-lp": Cl.uint(mintedCred)
        })
      )
    )
    if (disp) {console.log("mintPass:", JSON.stringify(initialLiquidity.result, null, 2))}

    const TRANSFER_WELSH = 10000;

    const transferFromDeployerFail = simnet.callPublicFn(
      "welsh-street-liquidity",
      "transfer",
      [
        Cl.uint(TRANSFER_WELSH),
        Cl.contractPrincipal(deployer, "welsh-street-exchange"),
        Cl.standardPrincipal(wallet1),
        Cl.none(),
      ],
      deployer);
    expect(transferFromDeployerFail.result).toBeErr(Cl.uint(702));
    
    const transferFromExchangeFail = simnet.callPublicFn(
      "welsh-street-liquidity",
      "transfer",
      [
        Cl.uint(TRANSFER_WELSH),
        Cl.contractPrincipal(deployer, "welsh-street-exchange"),
        Cl.standardPrincipal(wallet1),
        Cl.none(),
      ],
      deployer);
    expect(transferFromExchangeFail.result).toBeErr(Cl.uint(702));

  });
});