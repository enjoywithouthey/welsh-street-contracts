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
  it("swap a for b test", () => {
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

    // STEP 3 - Transfer Welsh wallet1
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
    
  // STEP 4 - Set up a large swap amount
    const WELSH_SWAP = 50000; // Large relative to reserves
    const SLIP_MAX = 400; // basis points, 4% slippage
    const FEE_BASIS = 10000;

    // Use the same reserves as initial liquidity
    let aIn = WELSH_SWAP;
    let resA = INITIAL_WELSH;
    let resB = INITIAL_STREET;
    let exp = Math.floor((aIn * resB) / resA); // Expected output (no fees)
    let fee = 50; // 0.5% fee (matches contract)

    // A-side fee calculation
    let aFee = Math.floor((aIn * fee) / FEE_BASIS);
    let aInNet = aIn - aFee;
    let aReward = Math.floor(aFee / 2); // Half of fee goes to rewards

    // AMM calculation with net input
    let aInWithFee = aInNet * (FEE_BASIS - fee);
    let num = aInWithFee * resB;
    let den = (resA * FEE_BASIS) + aInWithFee;
    let bOut = Math.floor(num / den);

    // B-side fee calculation
    let bFee = Math.floor((bOut * fee) / FEE_BASIS);
    let bOutNet = bOut - bFee;
    let bReward = Math.floor(bFee / 2); // Half of fee goes to rewards

    // Slippage calculation
    let slip = Math.floor(((exp - bOut) * FEE_BASIS) / exp);
    let minB = Math.floor((bOut * (FEE_BASIS - SLIP_MAX)) / FEE_BASIS);

    if (disp) {
      console.log("=== UPDATED TEST CALCULATIONS ===");
      console.log("aIn:", aIn);
      console.log("resA:", resA);
      console.log("resB:", resB);
      console.log("exp:", exp);
      console.log("fee:", fee);
      console.log("aFee:", aFee);
      console.log("aInNet:", aInNet);
      console.log("aReward:", aReward);
      console.log("aInWithFee:", aInWithFee);
      console.log("num:", num);
      console.log("den:", den);
      console.log("bOut:", bOut);
      console.log("bFee:", bFee);
      console.log("bOutNet:", bOutNet);
      console.log("bReward:", bReward);
      console.log("slip:", slip);
      console.log("minB:", minB);
    }
    
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
            "fee-a": Cl.uint(aFee), 
            "a-in": Cl.uint(aIn), 
            "b-out-net": Cl.uint(bOutNet) // Updated to match contract return
          })
        )
      );
      
      // STEP 5 - Check balances
      const welsh2StreetSwapBalanceWallet1 = simnet.callReadOnlyFn(
        "welshcorgicoin",
        "get-balance",
        [Cl.standardPrincipal(wallet1)],
        wallet1
      );
      expect(welsh2StreetSwapBalanceWallet1.result).toBeOk(Cl.uint(WELSH_TRANSFER - aIn));

      // Check Street token balance (user should receive bOutNet)
      const streetBalanceWallet1 = simnet.callReadOnlyFn(
        "street-token",
        "get-balance", 
        [Cl.standardPrincipal(wallet1)],
        wallet1
      );
      expect(streetBalanceWallet1.result).toBeOk(Cl.uint(bOutNet));

    } else {
      expect(welsh2StreetSwap.result).toEqual(
        Cl.error(Cl.uint(604)) // ERR_SLIPPAGE_EXCEEDED
      );
      if (disp) {console.log("ERR_SLIPPAGE_EXCEEDED:", Cl.uint(604))}
    }
  })
});

