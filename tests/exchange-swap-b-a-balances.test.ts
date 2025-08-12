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
  it("swap b for a test with balance verification", () => {
    // STEP 1 - Mint Street (same as before)
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

    // STEP 2 - Provide Initial Liquidity (same as before)
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

    // STEP 2.5 - Check Initial Balances (same as before)
    if (disp) {console.log("\n=== INITIAL BALANCES (After Step 2) ===");}

    // Exchange contract balances
    const exchangeWelshBalance = simnet.callReadOnlyFn(
      "welshcorgicoin",
      "get-balance",
      [Cl.contractPrincipal(deployer, "welsh-street-exchange")],
      deployer);
    expect(exchangeWelshBalance.result).toBeOk(Cl.uint(INITIAL_WELSH));
    if (disp) {console.log("Exchange Welsh Balance:", INITIAL_WELSH);}

    const exchangeStreetBalance = simnet.callReadOnlyFn(
      "street-token",
      "get-balance",
      [Cl.contractPrincipal(deployer, "welsh-street-exchange")],
      deployer);
    expect(exchangeStreetBalance.result).toBeOk(Cl.uint(INITIAL_STREET));
    if (disp) {console.log("Exchange Street Balance:", INITIAL_STREET);}

    // Rewards contract balances (should be 0 initially)
    const rewardsWelshBalance = simnet.callReadOnlyFn(
      "welshcorgicoin",
      "get-balance",
      [Cl.contractPrincipal(deployer, "welsh-street-rewards")],
      deployer);
    expect(rewardsWelshBalance.result).toBeOk(Cl.uint(0));
    if (disp) {console.log("Rewards Welsh Balance:", 0);}

    const rewardsStreetBalance = simnet.callReadOnlyFn(
      "street-token",
      "get-balance",
      [Cl.contractPrincipal(deployer, "welsh-street-rewards")],
      deployer);
    expect(rewardsStreetBalance.result).toBeOk(Cl.uint(0));
    if (disp) {console.log("Rewards Street Balance:", 0);}

    // Wallet1 balances (should be 0 initially)
    const wallet1WelshBalance = simnet.callReadOnlyFn(
      "welshcorgicoin",
      "get-balance",
      [Cl.standardPrincipal(wallet1)],
      wallet1);
    expect(wallet1WelshBalance.result).toBeOk(Cl.uint(0));
    if (disp) {console.log("Wallet1 Welsh Balance:", 0);}

    const wallet1StreetBalance = simnet.callReadOnlyFn(
      "street-token",
      "get-balance",
      [Cl.standardPrincipal(wallet1)],
      wallet1);
    expect(wallet1StreetBalance.result).toBeOk(Cl.uint(0));
    if (disp) {console.log("Wallet1 Street Balance:", 0);}

    // STEP 3 - Transfer STREET to wallet1 (CHANGED: Street instead of Welsh)
    const STREET_TRANSFER = 1000000;
    
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
    
    // STEP 4 - Set up swap calculations for B->A swap
    const STREET_SWAP = 1000000; // Swapping Street tokens
    const SLIP_MAX = 800; // basis points, 8% slippage
    const FEE_BASIS = 10000;

    // For swap-b-a: bIn (Street) -> aOut (Welsh)
    let bIn = STREET_SWAP;
    let resA = INITIAL_WELSH;     // Welsh reserves
    let resB = INITIAL_STREET;    // Street reserves
    let exp = Math.trunc((bIn * resA) / resB);  // Expected Welsh output
    let fee = 50; // 0.5% fee

    // B-side fee calculation (input side) - match Clarity exactly
    let bFee = Math.trunc((bIn * fee) / FEE_BASIS);
    let bInNet = bIn - bFee;
    let bReward = Math.trunc(bFee / 2);  // Use trunc to match Clarity

    // AMM calculation with net input
    let bInWithFee = bInNet * (FEE_BASIS - fee);
    let num = bInWithFee * resA;
    let den = (resB * FEE_BASIS) + bInWithFee;
    let aOut = Math.trunc(num / den);  // Use trunc to match Clarity

    // A-side fee calculation (output side) - match Clarity exactly
    let aFee = Math.trunc((aOut * fee) / FEE_BASIS);
    let aOutNet = aOut - aFee;
    let aReward = Math.trunc(aFee / 2);  // Rewards gets half (truncated)

    // Slippage calculation
    let slip = Math.trunc(((exp - aOut) * FEE_BASIS) / exp);

    if (disp) {
      console.log("\n=== SWAP B->A CALCULATIONS (Clarity-matched) ===");
      console.log("bIn:", bIn, "bFee:", bFee, "bInNet:", bInNet, "bReward:", bReward);
      console.log("aOut:", aOut, "aFee:", aFee, "aOutNet:", aOutNet, "aReward:", aReward);
      console.log("slip:", slip, "slip-max:", SLIP_MAX);
    }
    
    // STEP 4.5 - Perform the swap (CHANGED: swap-b-a)
    const street2WelshSwap = simnet.callPublicFn(
      "welsh-street-exchange",
      "swap-b-a",
      [
        Cl.uint(STREET_SWAP),
        Cl.uint(SLIP_MAX),
      ],
      wallet1);

    if (slip <= SLIP_MAX) {
      expect(street2WelshSwap.result).toEqual(
        Cl.ok(
          Cl.tuple({
            "a-out-net": Cl.uint(aOutNet),
            "b-in": Cl.uint(bIn), 
            "fee-a": Cl.uint(aFee), 
            "fee-b": Cl.uint(bFee), 
          })
        )
      );

      // STEP 5 - Check balances after swap
      if (disp) {console.log("\n=== BALANCES AFTER SWAP B->A ===");}

      // Exchange contract balances after swap
      const exchangeWelshAfter = simnet.callReadOnlyFn(
        "welshcorgicoin",
        "get-balance",
        [Cl.contractPrincipal(deployer, "welsh-street-exchange")],
        deployer);
      // Exchange loses full aOut, but keeps half of the A-side fee
      const aExchangeFee = aFee - aReward;  // Exchange keeps remainder
      const expectedExchangeWelsh = INITIAL_WELSH - aOut + aExchangeFee;
      expect(exchangeWelshAfter.result).toBeOk(Cl.uint(expectedExchangeWelsh));
      if (disp) {console.log("Exchange Welsh After:", expectedExchangeWelsh, "(-", aOut, "+", aExchangeFee, ")");}

      const exchangeStreetAfter = simnet.callReadOnlyFn(
        "street-token",
        "get-balance",
        [Cl.contractPrincipal(deployer, "welsh-street-exchange")],
        deployer);
      // Exchange receives full bIn, then sends bReward to rewards
      const expectedExchangeStreet = INITIAL_STREET + bIn - bReward;
      expect(exchangeStreetAfter.result).toBeOk(Cl.uint(expectedExchangeStreet));
      if (disp) {console.log("Exchange Street After:", expectedExchangeStreet, "(+", bIn, "-", bReward, ")");}

      // Rewards contract balances after swap
      const rewardsWelshAfter = simnet.callReadOnlyFn(
        "welshcorgicoin",
        "get-balance",
        [Cl.contractPrincipal(deployer, "welsh-street-rewards")],
        deployer);
      expect(rewardsWelshAfter.result).toBeOk(Cl.uint(aReward));
      if (disp) {console.log("Rewards Welsh After:", aReward, "(0.25% of A-side fee)");}

      const rewardsStreetAfter = simnet.callReadOnlyFn(
        "street-token",
        "get-balance",
        [Cl.contractPrincipal(deployer, "welsh-street-rewards")],
        deployer);
      expect(rewardsStreetAfter.result).toBeOk(Cl.uint(bReward));
      if (disp) {console.log("Rewards Street After:", bReward, "(0.25% of B-side fee)");}

      // Wallet1 balances after swap
      const wallet1WelshAfter = simnet.callReadOnlyFn(
        "welshcorgicoin",
        "get-balance",
        [Cl.standardPrincipal(wallet1)],
        wallet1);
      expect(wallet1WelshAfter.result).toBeOk(Cl.uint(aOutNet));
      if (disp) {console.log("Wallet1 Welsh After:", aOutNet, "(received from swap)");}

      const wallet1StreetAfter = simnet.callReadOnlyFn(
        "street-token",
        "get-balance",
        [Cl.standardPrincipal(wallet1)],
        wallet1);
      const expectedWallet1Street = STREET_TRANSFER - bIn;
      expect(wallet1StreetAfter.result).toBeOk(Cl.uint(expectedWallet1Street));
      if (disp) {console.log("Wallet1 Street After:", expectedWallet1Street, "(-", bIn, ")");}

      // STEP 5.5 - Verify totals balance
      if (disp) {
        console.log("\n=== BALANCE VERIFICATION ===");
        console.log("A-side fee breakdown:");
        console.log("  Total aFee:", aFee, "(0.5% of", aOut, ")");
        console.log("  Exchange keeps:", aExchangeFee, "(0.25%)");
        console.log("  Rewards gets:", aReward, "(0.25%)");
        console.log("  User receives:", aOutNet, "(", aOut, "-", aFee, ")");
        
        const totalWelshBefore = INITIAL_WELSH;
        const totalWelshAfter = expectedExchangeWelsh + aReward + aOutNet;
        console.log("Total Welsh Before:", totalWelshBefore);
        console.log("Total Welsh After:", totalWelshAfter);
        console.log("Welsh Conservation:", totalWelshBefore === totalWelshAfter ? "✓" : "✗");

        const totalStreetBefore = INITIAL_STREET + STREET_TRANSFER;
        const totalStreetAfter = expectedExchangeStreet + bReward + expectedWallet1Street;
        console.log("Total Street Before:", totalStreetBefore);
        console.log("Total Street After:", totalStreetAfter);
        console.log("Street Conservation:", totalStreetBefore === totalStreetAfter ? "✓" : "✗");
      }

    } else {
      expect(street2WelshSwap.result).toEqual(
        Cl.error(Cl.uint(604)) // ERR_SLIPPAGE_EXCEEDED
      );
      if (disp) {console.log("ERR_SLIPPAGE_EXCEEDED:", Cl.uint(604))}
    }
  })
});
