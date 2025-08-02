import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const disp = true;

describe("exchange provide liquidity", () => {
  it("wallet1 tries to provide liquidity without pool initialized", () => {
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

    const TRANSFER_WELSH = 100000
    const TRANSFER_STREET = TRANSFER_WELSH * 100

    const transferWelsh = simnet.callPublicFn(
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
    expect(transferWelsh.result).toBeOk(Cl.bool(true));

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

    const provideLiquidityFail = simnet.callPublicFn(
      "welsh-street-exchange",
      "provide-liquidity",
      [Cl.uint(TRANSFER_WELSH)],
      wallet1
    );
    expect(provideLiquidityFail.result).toBeErr(Cl.uint(603));
    if (disp) {console.log("provideLiquidityFail", Cl.uint(603))}
  });

  it("wallet provides liquidity after pool initialized", () => {
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

    const TRANSFER_WELSH = 100000
    const TRANSFER_STREET = TRANSFER_WELSH * 100

    const transferWelsh = simnet.callPublicFn(
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
    expect(transferWelsh.result).toBeOk(Cl.bool(true));

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

    const initialLiquidityPass = simnet.callPublicFn(
      "welsh-street-exchange",
      "initial-liquidity",
      [Cl.uint(TRANSFER_WELSH)],
      deployer
    );

    const mintedLp= Math.floor(Math.sqrt(TRANSFER_WELSH * TRANSFER_STREET));
    
    expect(initialLiquidityPass.result).toEqual(
      Cl.ok(
        Cl.tuple({
          "added-a": Cl.uint(TRANSFER_WELSH),
          "added-b": Cl.uint(TRANSFER_STREET),
          "minted-lp": Cl.uint(mintedLp)
        })
      )
    );
    if (disp) {console.log("initialLiquidityPass:", JSON.stringify(initialLiquidityPass.result, null, 2))}

    const provideLiquidityPass = simnet.callPublicFn(
      "welsh-street-exchange",
      "provide-liquidity",
      [Cl.uint(TRANSFER_WELSH)],
      wallet1
    );
    expect(provideLiquidityPass.result).toEqual(
      Cl.ok(
        Cl.tuple({
          "added-a": Cl.uint(TRANSFER_WELSH),
          "added-b": Cl.uint(TRANSFER_STREET),
          "minted-lp": Cl.uint(mintedLp),
        })
      )
    );
    if (disp) {console.log("provideLiquidityPass:", JSON.stringify(provideLiquidityPass.result, null, 2))}
  });
});