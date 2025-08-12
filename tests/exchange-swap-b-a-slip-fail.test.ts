import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";
import { disp,
  COMMUNITY_MINT_AMOUNT,
  COMMUNITY_MINT_CAP,
  INITIAL_WELSH,
  INITIAL_STREET,
  INITIAL_LP
} from "../vitestconfig"

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;

describe("exchange initial liquidity", () => {
  it("swap b for a test with slippage failure", () => {
    // STEP 1 - Mint Street
    const communityMint = simnet.callPublicFn(
      "street-token",
      "community-mint",
      [Cl.uint(COMMUNITY_MINT_AMOUNT)],
      deployer
    );

    let circulatingSupply = 0;
    let communityMinted = 0;

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

    // STEP 2 - Provide Initial Liquidity
    const initialLiquidity = simnet.callPublicFn( 
      "welsh-street-exchange",
      "initial-liquidity",
      [Cl.uint(INITIAL_WELSH)],
      deployer);
    expect(initialLiquidity.result).toEqual(
    Cl.ok(
      Cl.tuple({
        "added-a": Cl.uint(INITIAL_WELSH),
        "added-b": Cl.uint(INITIAL_STREET),
        "minted-lp": Cl.uint(INITIAL_LP)
        })
      )
    )

    const initialLiquidityWelshBalance = simnet.callReadOnlyFn(
      "welshcorgicoin",
      "get-balance",
      [Cl.contractPrincipal(deployer, "welsh-street-exchange")],
      deployer);
      expect(initialLiquidityWelshBalance.result).toBeOk(Cl.uint(INITIAL_WELSH));
      if (disp) {console.log("initialLiquidityWelshBalance:", Cl.uint(INITIAL_WELSH))}
      
    const initialLiquidityStreetBalance = simnet.callReadOnlyFn(
      "street-token",
      "get-balance",
      [Cl.contractPrincipal(deployer, "welsh-street-exchange")],
      deployer);
      expect(initialLiquidityStreetBalance.result).toBeOk(Cl.uint(INITIAL_STREET));
      if (disp) {console.log("initialLiquidityStreetBalance:", Cl.uint(INITIAL_STREET))}
        
    const initialLiquidityCredBalance = simnet.callReadOnlyFn(
      "welsh-street-liquidity",
      "get-balance",
      [Cl.contractPrincipal(deployer, "welsh-street-exchange")],
      deployer);
      expect(initialLiquidityCredBalance.result).toBeOk(Cl.uint(INITIAL_LP));
      if (disp) {console.log("initialLiquidityBalance:", Cl.uint(INITIAL_LP))}

    // STEP 3 - Transfer Street to wallet1 (for B→A swap)
    const STREET_TRANSFER = 10000000; // 10M Street tokens
    
    const streetTransfer = simnet.callPublicFn(
      "street-token",
      "transfer",
      [
        Cl.uint(STREET_TRANSFER),
        Cl.standardPrincipal(deployer),
        Cl.standardPrincipal(wallet1),
        Cl.none(),
      ],
      deployer);
    expect(streetTransfer.result).toBeOk(Cl.bool(true));

    const streetTransferBalance = simnet.callReadOnlyFn(
      "street-token",
      "get-balance",
      [Cl.standardPrincipal(wallet1)],
      wallet1
    );
    expect(streetTransferBalance.result).toBeOk(Cl.uint(STREET_TRANSFER)); 
    
    // STEP 4 - Set up a large swap amount (Street → Welsh)
    const STREET_SWAP = 5000000; // Large relative to reserves (5M Street)
    const SLIP_MAX = 200; // basis points, 2% slippage (VERY LOW to trigger failure)
    const FEE_BASIS = 10000;

    // For B→A swap: B=Street (input), A=Welsh (output)
    let bIn = STREET_SWAP;        // Street input
    let resB = INITIAL_STREET;    // Street reserves
    let resA = INITIAL_WELSH;     // Welsh reserves
    let exp = Math.trunc((bIn * resA) / resB); // Expected Welsh output (no fees)
    let fee = 50; // 0.5% fee

    // B-side fee calculation (Street input fee)
    let bFee = Math.trunc((bIn * fee) / FEE_BASIS);
    let bInNet = bIn - bFee;
    let bReward = Math.trunc(bFee / 2); // Half of fee goes to rewards

    // AMM calculation with net input
    let bInWithFee = bInNet * (FEE_BASIS - fee);
    let num = bInWithFee * resA;
    let den = (resB * FEE_BASIS) + bInWithFee;
    let aOut = Math.trunc(num / den);

    // A-side fee calculation (Welsh output fee)
    let aFee = Math.trunc((aOut * fee) / FEE_BASIS);
    let aOutNet = aOut - aFee;
    let aReward = Math.trunc(aFee / 2); // Half of fee goes to rewards

    // Slippage calculation
    let slip = Math.trunc(((exp - aOut) * FEE_BASIS) / exp);

    if (disp) {
      console.log("=== SWAP B→A TEST CALCULATIONS ===");
      console.log("bIn (Street):", bIn);
      console.log("resB (Street):", resB);
      console.log("resA (Welsh):", resA);
      console.log("exp (Welsh):", exp);
      console.log("fee:", fee);
      console.log("bFee:", bFee);
      console.log("bInNet:", bInNet);
      console.log("bReward:", bReward);
      console.log("bInWithFee:", bInWithFee);
      console.log("num:", num);
      console.log("den:", den);
      console.log("aOut (Welsh):", aOut);
      console.log("aFee:", aFee);
      console.log("aOutNet:", aOutNet);
      console.log("aReward:", aReward);
      console.log("slip:", slip);
      console.log("SLIP_MAX:", SLIP_MAX);
      console.log("Will fail slippage?", slip > SLIP_MAX);
    }
    
    const street2WelshSwap = simnet.callPublicFn(
      "welsh-street-exchange",
      "swap-b-a",
      [
        Cl.uint(STREET_SWAP),
        Cl.uint(SLIP_MAX),
      ],
      wallet1);

    if (slip <= SLIP_MAX) {
      // This should NOT happen with our test parameters
      expect(street2WelshSwap.result).toEqual(
        Cl.ok(
          Cl.tuple({
            "fee-b": Cl.uint(bFee), 
            "b-in": Cl.uint(bIn), 
            "a-out-net": Cl.uint(aOutNet) // User receives net Welsh
          })
        )
      );
      
      // STEP 5 - Check balances (should not reach here)
      const street2WelshSwapBalanceWallet1 = simnet.callReadOnlyFn(
        "street-token",
        "get-balance",
        [Cl.standardPrincipal(wallet1)],
        wallet1
      );
      expect(street2WelshSwapBalanceWallet1.result).toBeOk(Cl.uint(STREET_TRANSFER - bIn));

      // Check Welsh token balance (user should receive aOutNet)
      const welshBalanceWallet1 = simnet.callReadOnlyFn(
        "welshcorgicoin",
        "get-balance", 
        [Cl.standardPrincipal(wallet1)],
        wallet1
      );
      expect(welshBalanceWallet1.result).toBeOk(Cl.uint(aOutNet));

      if (disp) {console.log("Swap succeeded unexpectedly!");}

    } else {
      // This SHOULD happen with our test parameters
      expect(street2WelshSwap.result).toEqual(
        Cl.error(Cl.uint(604)) // ERR_SLIPPAGE_EXCEEDED
      );
      if (disp) {console.log("✓ ERR_SLIPPAGE_EXCEEDED:", Cl.uint(604))}
      if (disp) {console.log("✓ Slippage test passed - swap correctly failed");}

      // Verify wallet1 balances unchanged after failed swap
      const streetBalanceAfterFail = simnet.callReadOnlyFn(
        "street-token",
        "get-balance",
        [Cl.standardPrincipal(wallet1)],
        wallet1
      );
      expect(streetBalanceAfterFail.result).toBeOk(Cl.uint(STREET_TRANSFER));

      const welshBalanceAfterFail = simnet.callReadOnlyFn(
        "welshcorgicoin",
        "get-balance",
        [Cl.standardPrincipal(wallet1)],
        wallet1
      );
      expect(welshBalanceAfterFail.result).toBeOk(Cl.uint(0)); // Should still be 0

      if (disp) {console.log("✓ Balances unchanged after failed swap");}
    }
  })
});

