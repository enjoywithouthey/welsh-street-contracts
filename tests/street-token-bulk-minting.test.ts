import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

describe("street token community minting", () => {
  it("community mint until cap reached", () => {
    const communityMint1 = simnet.callPublicFn(
      "street-token",
      "community-mint",
      [],
      deployer
    );

    expect(communityMint1.result).toEqual(
    Cl.ok(
      Cl.tuple({
        "community-mints-remaining": Cl.uint(3),
        "circulating-supply": Cl.uint(1000000000000000),
        })
      )
    );

    const communityMint2 = simnet.callPublicFn(
      "street-token",
      "community-mint",
      [],
      deployer
    );

    expect(communityMint2.result).toEqual(
    Cl.ok(
      Cl.tuple({
        "community-mints-remaining": Cl.uint(2),
        "circulating-supply": Cl.uint(2000000000000000),
        })
      )
    );

    const communityMint3 = simnet.callPublicFn(
      "street-token",
      "community-mint",
      [],
      deployer
    );

    expect(communityMint3.result).toEqual(
    Cl.ok(
      Cl.tuple({
        "community-mints-remaining": Cl.uint(1),
        "circulating-supply": Cl.uint(3000000000000000),
        })
      )
    );

    const communityMint4 = simnet.callPublicFn(
      "street-token",
      "community-mint",
      [],
      deployer
    );

    expect(communityMint4.result).toEqual(
    Cl.ok(
      Cl.tuple({
        "community-mints-remaining": Cl.uint(0),
        "circulating-supply": Cl.uint(4000000000000000),
        })
      )
    );

    const communityMint5 = simnet.callPublicFn(
      "street-token",
      "community-mint",
      [],
      deployer
    );

    expect(communityMint5.result).toEqual(
      Cl.error(Cl.uint(904))
    );

    const communityMint4br = simnet.callReadOnlyFn( //balance reponse
      "street-token",
      "get-balance",
      [Cl.standardPrincipal(deployer)],
      deployer
    );
    expect(communityMint4br.result).toBeOk(Cl.uint(4000000000000000));
  })
});