import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

describe("street token transfers", () => {
  it("transfers 10000 tokens from deployer to wallet1", () => {
    const transfer1 = simnet.callPublicFn(
      "welshcorgicoin",
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
      "welshcorgicoin",
      "get-balance",
      [Cl.standardPrincipal(wallet1)],
      wallet1
    );
    expect(transfer1br.result).toBeOk(Cl.uint(10000));
  });
});