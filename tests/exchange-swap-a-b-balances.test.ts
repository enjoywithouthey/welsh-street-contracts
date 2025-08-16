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
  it("swap a for b test with balance verification", () => {
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

    // STEP 2 - Provide Initial Liquidity
    const initialLiquidity = simnet.callPublicFn( 
      "welsh-street-exchange",
      "lock-liquidity",
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

    // STEP 2.5 - Check Initial Balances (End of Step 2)
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

    // STEP 3 - Transfer Welsh to wallet1
    const WELSH_TRANSFER = 1000000;
    
    const welshTransfer = simnet.callPublicFn(
      "welshcorgicoin",
      "transfer",
      [
        Cl.uint(WELSH_TRANSFER),
        Cl.standardPrincipal(deployer),
        Cl.standardPrincipal(wallet1),
        Cl.none(),
      ],
      deployer);
    expect(welshTransfer.result).toBeOk(Cl.bool(true));

    const welshTransferBalance = simnet.callReadOnlyFn(
      "welshcorgicoin",
      "get-balance",
      [Cl.standardPrincipal(wallet1)],
      wallet1
    );
    expect(welshTransferBalance.result).toBeOk(Cl.uint(WELSH_TRANSFER)); 
    
    // STEP 4 - Set up swap calculations with exact Clarity matching
    const WELSH_SWAP = 10000;
    const SLIP_MAX = 800; // basis points, 8% slippage
    const FEE_BASIS = 10000;

    // Use the same reserves as initial liquidity
    let aIn = WELSH_SWAP;
    let resA = INITIAL_WELSH;
    let resB = INITIAL_STREET;
    let exp = Math.trunc((aIn * resB) / resA);  // Use trunc to match Clarity
    let fee = 50; // 0.5% fee

    // A-side fee calculation - match Clarity exactly
    let aFee = Math.trunc((aIn * fee) / FEE_BASIS);
    let aInNet = aIn - aFee;
    let aReward = Math.trunc(aFee / 2);  // Use trunc to match Clarity

    // AMM calculation with net input
    let aInWithFee = aInNet * (FEE_BASIS - fee);
    let num = aInWithFee * resB;
    let den = (resA * FEE_BASIS) + aInWithFee;
    let bOut = Math.trunc(num / den);  // Use trunc to match Clarity

    // B-side fee calculation - match Clarity exactly
    let bFee = Math.trunc((bOut * fee) / FEE_BASIS);
    let bOutNet = bOut - bFee;
    let bReward = Math.trunc(bFee / 2);  // Rewards gets half (truncated)

    // Slippage calculation
    let slip = Math.trunc(((exp - bOut) * FEE_BASIS) / exp);

    if (disp) {
      console.log("\n=== SWAP CALCULATIONS (Clarity-matched) ===");
      console.log("aIn:", aIn, "aFee:", aFee, "aInNet:", aInNet, "aReward:", aReward);
      console.log("bOut:", bOut, "bFee:", bFee, "bOutNet:", bOutNet, "bReward:", bReward);
      console.log("slip:", slip, "slip-max:", SLIP_MAX);
    }
    
    // STEP 4.5 - Perform the swap
    const welsh2StreetSwap = simnet.callPublicFn(
      "welsh-street-exchange",
      "swap-a-b",
      [
        Cl.uint(WELSH_SWAP),
        Cl.uint(SLIP_MAX),
      ],
      wallet1);

    if (slip <= SLIP_MAX) {
      expect(welsh2StreetSwap.result).toEqual(
        Cl.ok(
          Cl.tuple({
            "a-in": Cl.uint(aIn), 
            "b-out-net": Cl.uint(bOutNet),
            "fee-a": Cl.uint(aFee), 
            "fee-b": Cl.uint(bFee), 
          })
        )
      );

      // STEP 5 - Check balances after swap
      if (disp) {console.log("\n=== BALANCES AFTER SWAP ===");}

      // Exchange contract balances after swap
      const exchangeWelshAfter = simnet.callReadOnlyFn(
        "welshcorgicoin",
        "get-balance",
        [Cl.contractPrincipal(deployer, "welsh-street-exchange")],
        deployer);
      // Exchange receives full aIn, then sends aReward to rewards
      const expectedExchangeWelsh = INITIAL_WELSH + aIn - aReward;
      expect(exchangeWelshAfter.result).toBeOk(Cl.uint(expectedExchangeWelsh));
      if (disp) {console.log("Exchange Welsh After:", expectedExchangeWelsh, "(+", aIn, "-", aReward, ")");}

      const exchangeStreetAfter = simnet.callReadOnlyFn(
        "street-token",
        "get-balance",
        [Cl.contractPrincipal(deployer, "welsh-street-exchange")],
        deployer);
      // Exchange loses full bOut, but keeps half of the B-side fee (0.25% of bOut)
      const bExchangeFee = bFee - bReward;  // This ensures bReward + bExchangeFee = bFee exactly
      const expectedExchangeStreet = INITIAL_STREET - bOut + bExchangeFee;
      expect(exchangeStreetAfter.result).toBeOk(Cl.uint(expectedExchangeStreet));
      if (disp) {console.log("Exchange Street After:", expectedExchangeStreet, "(-", bOut, "+", bExchangeFee, ")");}

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
      const expectedWallet1Welsh = WELSH_TRANSFER - aIn;
      expect(wallet1WelshAfter.result).toBeOk(Cl.uint(expectedWallet1Welsh));
      if (disp) {console.log("Wallet1 Welsh After:", expectedWallet1Welsh, "(-", aIn, ")");}

      const wallet1StreetAfter = simnet.callReadOnlyFn(
        "street-token",
        "get-balance",
        [Cl.standardPrincipal(wallet1)],
        wallet1);
      expect(wallet1StreetAfter.result).toBeOk(Cl.uint(bOutNet));
      if (disp) {console.log("Wallet1 Street After:", bOutNet, "(bOut - bFee)");}

      // STEP 5.5 - Verify totals balance
      if (disp) {
        console.log("\n=== BALANCE VERIFICATION ===");
        console.log("B-side fee breakdown:");
        console.log("  Total bFee:", bFee, "(0.5% of", bOut, ")");
        console.log("  Exchange keeps:", bExchangeFee, "(0.25%)");
        console.log("  Rewards gets:", bReward, "(0.25%)");
        console.log("  User receives:", bOutNet, "(", bOut, "-", bFee, ")");
        
        const totalWelshBefore = INITIAL_WELSH + WELSH_TRANSFER;
        const totalWelshAfter = expectedExchangeWelsh + aReward + expectedWallet1Welsh;
        console.log("Total Welsh Before:", totalWelshBefore);
        console.log("Total Welsh After:", totalWelshAfter);
        console.log("Welsh Conservation:", totalWelshBefore === totalWelshAfter ? "✓" : "✗");

        const totalStreetBefore = INITIAL_STREET;
        const totalStreetAfter = expectedExchangeStreet + bReward + bOutNet;
        console.log("Total Street Before:", totalStreetBefore);
        console.log("Total Street After:", totalStreetAfter);
        console.log("Street Conservation:", totalStreetBefore === totalStreetAfter ? "✓" : "✗");
      }

    } else {
      expect(welsh2StreetSwap.result).toEqual(
        Cl.error(Cl.uint(604)) // ERR_SLIPPAGE_EXCEEDED
      );
      if (disp) {console.log("ERR_SLIPPAGE_EXCEEDED:", Cl.uint(604))}
    }
  })
});
