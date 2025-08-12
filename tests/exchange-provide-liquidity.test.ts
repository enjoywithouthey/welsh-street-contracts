import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";
import { disp,
  COMMUNITY_MINT_AMOUNT,
  COMMUNITY_MINT_CAP,
} from "../vitestconfig"

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;

describe("exchange provide liquidity", () => {
  it("wallet1 tries to provide liquidity without pool initialized", () => {

    let circulatingSupply = 0;
    let communityMinted = 0;

    const communityMint = simnet.callPublicFn(
      "street-token",
      "community-mint",
      [Cl.uint(COMMUNITY_MINT_AMOUNT)],
      deployer
    );

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
    const COMMUNITY_MINT_AMOUNT = 1000000000000000
    let circulatingSupply = 0;
    let communityMinted = 0;

    const communityMint = simnet.callPublicFn(
      "street-token",
      "community-mint",
      [Cl.uint(COMMUNITY_MINT_AMOUNT)],
      deployer
    );

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
          "minted-lp": Cl.uint(0)
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