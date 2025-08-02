import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

describe("street token transfers", () => {
  it("transfers 10000 tokens from deployer to wallet1", () => {
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

    const transfer1 = simnet.callPublicFn(
      "street-token",
      "transfer",
      [
        Cl.uint(10000),
        Cl.standardPrincipal(deployer),
        Cl.standardPrincipal(wallet1),
        Cl.none(),
      ],
      deployer);
    expect(transfer1.result).toBeOk(Cl.bool(true));

    const transfer1br = simnet.callReadOnlyFn(
      "street-token",
      "get-balance",
      [Cl.standardPrincipal(wallet1)],
      wallet1
    );
    expect(transfer1br.result).toBeOk(Cl.uint(10000));
  });

  it("transfers too many from wallet_1 to wallet_2", () => {
    const transfer2 = simnet.callPublicFn(
      "street-token",
      "transfer",
      [
        Cl.uint(20000),
        Cl.standardPrincipal(wallet1),
        Cl.standardPrincipal(wallet2),
        Cl.none(),
      ],
      wallet1
    );

    expect(transfer2.result).toBeErr(Cl.uint(1));
  });

    it("transfers 5000 from wallet_1 to wallet_2", () => {
    const transfer3 = simnet.callPublicFn(
      "street-token",
      "transfer",
      [
        Cl.uint(5000),
        Cl.standardPrincipal(wallet1),
        Cl.standardPrincipal(wallet2),
        Cl.none(),
      ],
      wallet1
    );

    expect(transfer3.result).toBeErr(Cl.uint(1));
  });

});