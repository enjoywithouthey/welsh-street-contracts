import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

const amount = 10000;
const COMMUNITY_MINT_CAP = 4000000000000000

let communityMinted = 0;
let circulatingSupply = 0

describe("street token transfers", () => {
  it("transfers 10000 tokens from deployer to wallet1", () => {
    const communityMint = simnet.callPublicFn(
      "street-token",
      "community-mint",
      [Cl.uint(amount)],
      deployer);
    
    circulatingSupply = circulatingSupply + amount
    communityMinted = communityMinted + amount

    expect(communityMint.result).toEqual(
    Cl.ok(
      Cl.tuple({
        "circulating-supply": Cl.uint(amount),
        "community-mint-remaining": Cl.uint(COMMUNITY_MINT_CAP - communityMinted),
        })
      )
    );

    const transfer1 = simnet.callPublicFn(
      "street-token",
      "transfer",
      [
        Cl.uint(amount),
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
    expect(transfer1br.result).toBeOk(Cl.uint(amount));
  });

  it("transfers too many from wallet_1 to wallet_2", () => {
    const transfer2 = simnet.callPublicFn(
      "street-token",
      "transfer",
      [
        Cl.uint(amount * 2),
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
        Cl.uint(amount * 0.5),
        Cl.standardPrincipal(wallet1),
        Cl.standardPrincipal(wallet2),
        Cl.none(),
      ],
      wallet1
    );

    expect(transfer3.result).toBeErr(Cl.uint(1));
  });
});