import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

describe("street-token", () => {
  it("bulk mint until cap reached", () => {
    const bulkMint1 = simnet.callPublicFn(
      "welsh-street-token",
      "bulk-mint",
      [],
      deployer
    );

    expect(bulkMint1.result).toEqual(
    Cl.ok(
      Cl.tuple({
        "bulk-mints-remaining": Cl.uint(3),
        "circulating-supply": Cl.uint(1000000000000000),
        })
      )
    );

    const bulkMint2 = simnet.callPublicFn(
      "welsh-street-token",
      "bulk-mint",
      [],
      deployer
    );

    expect(bulkMint2.result).toEqual(
    Cl.ok(
      Cl.tuple({
        "bulk-mints-remaining": Cl.uint(2),
        "circulating-supply": Cl.uint(2000000000000000),
        })
      )
    );

    const bulkMint3 = simnet.callPublicFn(
      "welsh-street-token",
      "bulk-mint",
      [],
      deployer
    );

    expect(bulkMint3.result).toEqual(
    Cl.ok(
      Cl.tuple({
        "bulk-mints-remaining": Cl.uint(1),
        "circulating-supply": Cl.uint(3000000000000000),
        })
      )
    );

    const bulkMint4 = simnet.callPublicFn(
      "welsh-street-token",
      "bulk-mint",
      [],
      deployer
    );

    expect(bulkMint4.result).toEqual(
    Cl.ok(
      Cl.tuple({
        "bulk-mints-remaining": Cl.uint(0),
        "circulating-supply": Cl.uint(4000000000000000),
        })
      )
    );

    const bulkMint5 = simnet.callPublicFn(
      "welsh-street-token",
      "bulk-mint",
      [],
      deployer
    );

    expect(bulkMint5.result).toEqual(
      Cl.error(Cl.uint(904))
    );

    const bulkMint4br = simnet.callReadOnlyFn( //balance reponse
      "welsh-street-token",
      "get-balance",
      [Cl.standardPrincipal(deployer)],
      deployer
    );
    expect(bulkMint4br.result).toBeOk(Cl.uint(4000000000000000));
  })

  it("emission mint, emission mint, mine block, emission mint", () => {
    const emissionMint1 = simnet.callPublicFn(
      "welsh-street-token",
      "emission-mint",
      [],
      deployer
    );

    expect(emissionMint1.result).toEqual(
      Cl.ok(
        Cl.tuple({
          "circulating-supply": Cl.uint(100),
          "emission-amount": Cl.uint(100),
          "emission-block": Cl.uint(3),
          "epochs-completed": Cl.uint(1),
        })
      )
    );

    const emissionMint2 = simnet.callPublicFn(
      "welsh-street-token",
      "emission-mint",
      [],
      deployer
    );

    expect(emissionMint2.result).toEqual(
      Cl.error(Cl.uint(906))
    );

    const mineEmptyBurnBlock = simnet.mineEmptyBurnBlock();
    expect(mineEmptyBurnBlock).toBeDefined()

    const emissionMint3 = simnet.callPublicFn(
      "welsh-street-token",
      "emission-mint",
      [],
      deployer
    );

    expect(emissionMint3.result).toEqual(
      Cl.ok(
        Cl.tuple({
          "circulating-supply": Cl.uint(200),
          "emission-amount": Cl.uint(100),
          "emission-block": Cl.uint(4),
          "epochs-completed": Cl.uint(2),
        })
      )
    );

    const emissionMint3br = simnet.callReadOnlyFn(
      "welsh-street-token",
      "get-balance",
      [Cl.contractPrincipal("ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM","welsh-street-rewards")],
      deployer
    );
    expect(emissionMint3br.result).toBeOk(Cl.uint(200));

  });
  
  it("get-total-supply", () => {
    const getTotalSupply = simnet.callReadOnlyFn(
      "welsh-street-token",
      "get-total-supply",
      [],
      deployer);
  
      expect(getTotalSupply.result).toBeOk(Cl.uint(0))
  });

  it("get-circulating-supply", () => {
    const getCirculatingSupply = simnet.callReadOnlyFn(
      "welsh-street-token",
      "get-circulating-supply",
      [],
      deployer);
  
      expect(getCirculatingSupply.result).toBeOk(Cl.uint(0))
  });



  // it("transfers 42 tokens from wallet_1 to wallet_2", () => {
  //   // First, ensure wallet_1 has enough tokens by minting them
  //   simnet.callPublicFn(
  //     "street-token",
  //     "mint",
  //     [Cl.uint(100), Cl.standardPrincipal(wallet1)],
  //     deployer
  //   );

  //   const block = simnet.callPublicFn(
  //     "street-token",
  //     "transfer",
  //     [
  //       Cl.uint(42),
  //       Cl.standardPrincipal(wallet1),
  //       Cl.standardPrincipal(wallet2),
  //       Cl.none(),
  //     ],
  //     wallet1
  //   );

  //   expect(block.result).toBeOk(Cl.bool(true));

  //   // Check the balance of wallet_2
  //   const balanceResponse = simnet.callReadOnlyFn(
  //     "street-token",
  //     "get-balance",
  //     [Cl.standardPrincipal(wallet2)],
  //     wallet2
  //   );
  //   expect(balanceResponse.result).toBeOk(Cl.uint(42));
  // });

  // it("transfers more tokens from wallet_2 than wallet_2 owns to wallet_1", () => {
  //   const block = simnet.callPublicFn(
  //     "street-token",
  //     "transfer",
  //     [
  //       Cl.uint(42 * 42),
  //       Cl.standardPrincipal(wallet2),
  //       Cl.standardPrincipal(wallet1),
  //       Cl.none(),
  //     ],
  //     wallet2
  //   );

  //   expect(block.result).toBeErr(Cl.uint(1));
  // });
});