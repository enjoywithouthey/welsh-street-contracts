import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;
const disp = false;

describe("liquidity transfers", () => {
  it("transfers LP tokens from exchange to wallet1", () => {
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
      [],
      deployer);
    expect(communityMint.result).toEqual(
    Cl.ok(
      Cl.tuple({
        "community-mints-remaining": Cl.uint(3),
        "circulating-supply": Cl.uint(1000000000000000),
        })
      )
    );
    if (disp) {console.log("communityMint:", JSON.stringify(communityMint.result, null, 2))}

    const initialWelsh = 1000;
    const initialStreet = initialWelsh * 100;
    const mintedCred = Math.floor(Math.sqrt(initialWelsh * initialStreet));
    const initialLiquidity = simnet.callPublicFn( 
      "welsh-street-exchange",
      "initial-liquidity",
      [Cl.uint(initialWelsh)],
      deployer);
    expect(initialLiquidity.result).toEqual(
    Cl.ok(
      Cl.tuple({
        "added-a": Cl.uint(initialWelsh),
        "added-b": Cl.uint(initialStreet),
        "minted-lp": Cl.uint(mintedCred)
        })
      )
    )
    if (disp) {console.log("mintPass:", JSON.stringify(initialLiquidity.result, null, 2))}

      const transferFromDeployerFail = simnet.callPublicFn(
      "welsh-street-liquidity",
      "transfer",
      [
        Cl.uint(10000),
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
        Cl.uint(10000),
        Cl.contractPrincipal(deployer, "welsh-street-exchange"),
        Cl.standardPrincipal(wallet1),
        Cl.none(),
      ],
      deployer);
    expect(transferFromExchangeFail.result).toBeErr(Cl.uint(702));

  });
});