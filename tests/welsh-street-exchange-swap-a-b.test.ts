import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const disp = true;

describe("exchange initial liquidity", () => {
  it("mint $WELSH, mint $STREET, deployer provide initial LP", () => {
    const checkWelshBalance = simnet.callReadOnlyFn(
      "welshcorgicoin",
      "get-balance",
      [Cl.standardPrincipal(deployer)],
      deployer);
    expect(checkWelshBalance.result).toEqual(
    Cl.ok(Cl.uint(BigInt(10000000000000000n))));
    if (disp) {console.log("welshBalance:", Cl.ok(Cl.uint(BigInt(10000000000000000n))))}

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

    const initialWelsh = 1000000;
    const initialStreet = initialWelsh * 100; // 100:1 ratio
    const mintedLp = Math.floor(Math.sqrt(initialWelsh * initialStreet));
    
    const initialLiquidityPass = simnet.callPublicFn( 
      "welsh-street-exchange",
      "initial-liquidity",
      [Cl.uint(initialWelsh)],
      deployer);
    expect(initialLiquidityPass.result).toEqual(
    Cl.ok(
      Cl.tuple({
        "added-a": Cl.uint(initialWelsh),
        "added-b": Cl.uint(initialStreet),
        "minted-lp": Cl.uint(mintedLp)
        })
      )
    )
    if (disp) {console.log("initialLiquidityPass:", JSON.stringify(initialLiquidityPass.result, null, 2))}

    
    const initialLiquidityPassWelshBalance = simnet.callReadOnlyFn(
      "welshcorgicoin",
      "get-balance",
      [Cl.contractPrincipal(deployer, "welsh-street-exchange")],
      deployer);
      expect(initialLiquidityPassWelshBalance.result).toBeOk(Cl.uint(initialWelsh));
      if (disp) {console.log("initialLiquidityPassWelshBalance:", Cl.uint(initialWelsh))}
      
      const initialLiquidityPassStreetBalance = simnet.callReadOnlyFn(
        "street-token",
        "get-balance",
        [Cl.contractPrincipal(deployer, "welsh-street-exchange")],
        deployer);
        expect(initialLiquidityPassStreetBalance.result).toBeOk(Cl.uint(initialStreet));
        if (disp) {console.log("initialLiquidityPassStreetBalance:", Cl.uint(initialStreet))}

      const initialLiquidityPassCredBalance = simnet.callReadOnlyFn(
        "welsh-street-liquidity",
        "get-balance",
        [Cl.contractPrincipal(deployer, "welsh-street-exchange")],
        deployer);
      expect(initialLiquidityPassCredBalance.result).toBeOk(Cl.uint(mintedLp));
        if (disp) {console.log("initialLiquidityPassBalance:", Cl.uint(mintedLp))}
  });
 
});