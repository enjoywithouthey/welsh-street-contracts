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

    const communityMintBalance = simnet.callReadOnlyFn(
      "street-token",
      "get-balance",
      [Cl.standardPrincipal(deployer)],
      deployer);
    expect(communityMintBalance.result).toBeOk(Cl.uint(1000000000000000));
    if (disp) {console.log("communityMintBalance:", Cl.uint(1000000000000000))}

    const INITIAL_WELSH = 1000000;
    const INITIAL_STREET = INITIAL_WELSH * 100;
    const INITIAL_LP = Math.floor(Math.sqrt(INITIAL_WELSH * INITIAL_STREET));

    const mintFail = simnet.callPublicFn( 
      "welsh-street-liquidity",
      "mint",
      [Cl.uint(INITIAL_WELSH)],
      deployer);
    expect(mintFail.result).toBeErr(Cl.uint(701));;
    if (disp) {console.log("mintFail:", Cl.uint(701))}

    const mintFailBalance = simnet.callReadOnlyFn(
      "welsh-street-liquidity",
      "get-balance",
      [Cl.standardPrincipal(deployer)],
      deployer);
    expect(mintFailBalance.result).toBeOk(Cl.uint(0));
    if (disp) {console.log("mintFailBalance:", Cl.uint(0))}

    const initialLiquidity0Fail = simnet.callPublicFn( //try to mint zero value
      "welsh-street-exchange",
      "initial-liquidity",
      [Cl.uint(0)],
      deployer);
    expect(initialLiquidity0Fail.result).toBeErr(Cl.uint(605));;
    if (disp) {console.log("initialLiquidity0Fail:", Cl.uint(605))}

    const initialLiquidityPass = simnet.callPublicFn( 
      "welsh-street-exchange",
      "initial-liquidity",
      [Cl.uint(INITIAL_WELSH)],
      deployer);
    expect(initialLiquidityPass.result).toEqual(
    Cl.ok(
      Cl.tuple({
        "added-a": Cl.uint(INITIAL_WELSH),
        "added-b": Cl.uint(INITIAL_STREET),
        "minted-lp": Cl.uint(INITIAL_LP)
        })
      )
    )
    if (disp) {console.log("initialLiquidityPass:", JSON.stringify(initialLiquidityPass.result, null, 2))}

    const initialLiquidityPassWelshBalance = simnet.callReadOnlyFn(
      "welshcorgicoin",
      "get-balance",
      [Cl.contractPrincipal(deployer, "welsh-street-exchange")],
      deployer);
      expect(initialLiquidityPassWelshBalance.result).toBeOk(Cl.uint(INITIAL_WELSH));
      if (disp) {console.log("initialLiquidityPassWelshBalance:", Cl.uint(INITIAL_WELSH))}
      
    const initialLiquidityPassStreetBalance = simnet.callReadOnlyFn(
      "street-token",
      "get-balance",
      [Cl.contractPrincipal(deployer, "welsh-street-exchange")],
      deployer);
      expect(initialLiquidityPassStreetBalance.result).toBeOk(Cl.uint(INITIAL_STREET));
      if (disp) {console.log("initialLiquidityPassStreetBalance:", Cl.uint(INITIAL_STREET))}
        
    const initialLiquidityPassCredBalance = simnet.callReadOnlyFn(
      "welsh-street-liquidity",
      "get-balance",
      [Cl.contractPrincipal(deployer, "welsh-street-exchange")],
      deployer);
      expect(initialLiquidityPassCredBalance.result).toBeOk(Cl.uint(INITIAL_LP));
      if (disp) {console.log("initialLiquidityPassBalance:", Cl.uint(INITIAL_LP))}
  });
 
it("Provide initial LP, check lp-balances, burn LP, verify lp-balances", () => {
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

    const getInitialProviderCount = simnet.callReadOnlyFn(
      "welsh-street-liquidity",
      "get-provider-count",
      [],
      deployer);
    expect(getInitialProviderCount.result).toBeOk(Cl.uint(0))
    if (disp) {console.log("getInitialProviderCount:", Cl.uint(0))}

    const INITIAL_WELSH = 1000000;
    const INITIAL_STREET = INITIAL_WELSH * 100;
    const INITIAL_LP = Math.floor(Math.sqrt(INITIAL_WELSH * INITIAL_STREET));

    const initialLiquidityPass = simnet.callPublicFn( 
      "welsh-street-exchange",
      "initial-liquidity",
      [Cl.uint(INITIAL_WELSH)],
      deployer);
    expect(initialLiquidityPass.result).toEqual(
      Cl.ok(
        Cl.tuple({
          "added-a": Cl.uint(INITIAL_WELSH),
          "added-b": Cl.uint(INITIAL_STREET),
          "minted-lp": Cl.uint(INITIAL_LP)
        })
      )
    );
    if (disp) {console.log("initialLiquidityPass:", JSON.stringify(initialLiquidityPass.result, null, 2))}

    const getProviderCount = simnet.callReadOnlyFn(
      "welsh-street-liquidity",
      "get-provider-count",
      [],
      deployer);
    expect(getProviderCount.result).toBeOk(Cl.uint(1))
    if (disp) {console.log("getProviderCount:", Cl.uint(1))}

    const getLpBalance = simnet.callReadOnlyFn(
      "welsh-street-liquidity",
      "get-user-lp-balance",
      [Cl.contractPrincipal(deployer, "welsh-street-exchange")],
      deployer);
    expect(getLpBalance.result).toBeOk(Cl.uint(INITIAL_LP))
    if (disp) {console.log("getLpBalance:",Cl.uint(INITIAL_LP))}
    
    const BURN_AMOUNT = INITIAL_LP;

    const burnLiquidity = simnet.callPublicFn( 
      "welsh-street-exchange",
      "burn-liquidity",
      [Cl.uint(BURN_AMOUNT)],
      deployer);
    expect(burnLiquidity.result).toEqual(
    Cl.ok(
      Cl.tuple({
        "burned": Cl.uint(BURN_AMOUNT),
        })
      )
    )
    if (disp) {console.log("burnLiquidity:", JSON.stringify(burnLiquidity.result, null, 2))}

    const getLpBalanceAfterBurn = simnet.callReadOnlyFn(
      "welsh-street-liquidity",
      "get-user-lp-balance",
      [Cl.contractPrincipal(deployer, "welsh-street-exchange")],
      deployer);
    expect(getLpBalanceAfterBurn.result).toBeOk(Cl.uint(INITIAL_LP - BURN_AMOUNT))
    if (disp) {console.log("getLpBalanceAfterBurn:",Cl.uint(INITIAL_LP - BURN_AMOUNT))}

    const getProviderCountAfterBurn = simnet.callReadOnlyFn(
      "welsh-street-liquidity",
      "get-provider-count",
      [],
      deployer);
    expect(getProviderCountAfterBurn.result).toBeOk(Cl.uint(0))
    if (disp) {console.log("getProviderCountAfterBurn:", Cl.uint(0))}
  });  

  it("wallet1 tries to provide initial liquidity", () => {
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

    const INITIAL_WELSH = 1000000;
    const INITIAL_STREET = INITIAL_WELSH * 100;
    const INITIAL_LP = Math.floor(Math.sqrt(INITIAL_WELSH * INITIAL_STREET));
    
    const transferWelsh = simnet.callPublicFn(
      "welshcorgicoin",
      "transfer",
      [
        Cl.uint(INITIAL_WELSH),
        Cl.standardPrincipal(deployer),
        Cl.standardPrincipal(wallet1),
        Cl.none(),
      ],
      deployer);
    expect(transferWelsh.result).toBeOk(Cl.bool(true));


    const transferStreet = simnet.callPublicFn(
      "street-token",
      "transfer",
      [
        Cl.uint(INITIAL_STREET),
        Cl.standardPrincipal(deployer),
        Cl.standardPrincipal(wallet1),
        Cl.none()
      ],
      deployer);
    expect(transferStreet.result).toBeOk(Cl.bool(true));
  
    const transferStreetBalance = simnet.callReadOnlyFn(
      "street-token",
      "get-balance",
      [Cl.standardPrincipal(wallet1)],
      wallet1);
    expect(transferStreetBalance.result).toBeOk(Cl.uint(INITIAL_STREET));

    const initialLiquidityFail = simnet.callPublicFn( 
      "welsh-street-exchange",
      "initial-liquidity",
      [Cl.uint(INITIAL_LP)],
      wallet1);
    expect(initialLiquidityFail.result).toBeErr(Cl.uint(601));;
    if (disp) {console.log("mintFail:", Cl.uint(601))}
  });
});