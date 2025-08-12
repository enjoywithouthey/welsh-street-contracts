import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";
import { disp,
  COMMUNITY_MINT_AMOUNT,
  COMMUNITY_MINT_CAP,
  INITIAL_WELSH,
  INITIAL_STREET,
} from "../vitestconfig"

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;

describe("exchange initial liquidity", () => {
  it("rewards-claim-wallet1-no-lp.test", () => {
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
        "minted-lp": Cl.uint(0)
        })
      )
    )

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
    const WELSH_SWAP = 10000; //
    const SLIP_MAX = 800; // basis points, 8% slippage
    const FEE_BASIS = 10000;

    // Use the same reserves as initial liquidity
    let aIn = WELSH_SWAP;
    let resA = INITIAL_WELSH;
    let resB = INITIAL_STREET;
    let exp = Math.floor((aIn * resB) / resA); // Expected output (no fees)
    let fee = 50; // 0.5% fee

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
      console.log("=== WALLET 1 SWAPS ===");
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
            "a-in": Cl.uint(aIn), 
            "b-out-net": Cl.uint(bOutNet),
            "fee-a": Cl.uint(aFee), 
            "fee-b": Cl.uint(bFee), 
          })
        )
      );

    } else {
      expect(welsh2StreetSwap.result).toEqual(
        Cl.error(Cl.uint(604)) // ERR_SLIPPAGE_EXCEEDED
      );
      if (disp) {console.log("ERR_SLIPPAGE_EXCEEDED:", Cl.uint(604))}
    }


    // STEP 5 Check total rewards balance of WELSH and STREET in the rewards contract
    if (disp) { console.log("\n=== STEP 5: Check Rewards Contract Balances ==="); }

    const rewardsPoolInfo = simnet.callReadOnlyFn(
      "welsh-street-rewards",
      "get-reward-pool-info",
      [],
      deployer
    );

    expect(rewardsPoolInfo.result).toBeOk(
      Cl.tuple({
        "street-balance": Cl.uint(2450),
        "total-a-in-contract": Cl.uint(50), 
        "total-a-per-share": Cl.uint(0),
        "total-b-in-contract": Cl.uint(4900),
        "total-b-per-share": Cl.uint(0),  
        "welsh-balance": Cl.uint(25),  
      })
    );

    const poolInfo = rewardsPoolInfo.result as any;
    console.log("poolInfo:", JSON.stringify(poolInfo, null, 2));
    if (disp) {
      console.log("Rewards Contract Welsh Balance:", poolInfo.value.value["welsh-balance"].value);
      console.log("Rewards Contract Street Balance:", poolInfo.value.value["street-balance"].value);
      console.log("Total A Per Share:", poolInfo.value.value["total-a-per-share"].value);
      console.log("Total B Per Share:", poolInfo.value.value["total-b-per-share"].value);
    }

    // STEP 6 Check wallet1 balance of LP tokens (should be 0, so no rewards)
    if (disp) { console.log("\n=== STEP 6: Check Wallet1 LP Balance and Rewards ==="); }

    const wallet1LPBalance = simnet.callReadOnlyFn(
      "welsh-street-liquidity",
      "get-balance",
      [Cl.standardPrincipal(wallet1)],
      wallet1
    );
    expect(wallet1LPBalance.result).toBeOk(Cl.uint(0)); // wallet1 has no LP tokens

    const wallet1RewardInfo = simnet.callReadOnlyFn(
      "welsh-street-rewards",
      "get-reward-user-balances",
      [Cl.standardPrincipal(wallet1)],
      wallet1
    );

    expect(wallet1RewardInfo.result).toBeOk(
      Cl.tuple({
        "accumulated-a": Cl.uint(0), 
        "accumulated-b": Cl.uint(0), 
        "current-lp-amount": Cl.uint(0), 
        "reward-debt-a": Cl.uint(0), 
        "reward-debt-b": Cl.uint(0),
        "stored-lp-amount": Cl.uint(0), 
        "total-a-per-share": Cl.uint(0), 
        "total-b-per-share": Cl.uint(0), 
        "unclaimed-a": Cl.uint(0), 
        "unclaimed-b": Cl.uint(0),  
      })
    );
    const wallet1Rewards = wallet1RewardInfo.result as any;

    if (disp) {
      console.log("Wallet1 LP Amount:", wallet1Rewards.value.value["current-lp-amount"].value);
      console.log("Wallet1 Unclaimed Welsh:", wallet1Rewards.value.value["unclaimed-a"].value);
      console.log("Wallet1 Unclaimed Street:", wallet1Rewards.value.value["unclaimed-b"].value);
    }

    // STEP 7 wallet1 tries to claim rewards (should get 0 since no LP)
    if (disp) { console.log("\n=== STEP 7: Wallet1 Claims Rewards ==="); }

    const wallet1Claim = simnet.callPublicFn(
      "welsh-street-rewards",
      "claim",
      [],
      wallet1
    );

    expect(wallet1Claim.result).toEqual(
      Cl.ok(
        Cl.tuple({
          "claimed-a": Cl.uint(0),
          "claimed-b": Cl.uint(0)
        })
      )
    );

    if (disp) {
      console.log("Wallet1 Claim Result:", JSON.stringify(wallet1Claim.result, null, 2));
    }

    // STEP 8 Check total rewards balance after claim (should be unchanged since wallet1 claimed 0)
    if (disp) { console.log("\n=== STEP 8: Check Rewards Contract Balances After Claim ==="); }

    const rewardsPoolInfoAfter = simnet.callReadOnlyFn(
      "welsh-street-rewards",
      "get-reward-pool-info",
      [],
      deployer
    );

    expect(rewardsPoolInfo.result).toBeOk(
      Cl.tuple({
        "street-balance": Cl.uint(2450),
        "total-a-in-contract": Cl.uint(50), 
        "total-a-per-share": Cl.uint(0),
        "total-b-in-contract": Cl.uint(4900),
        "total-b-per-share": Cl.uint(0),  
        "welsh-balance": Cl.uint(25),  
      })
    );
    const poolInfoAfter = rewardsPoolInfoAfter.result as any;

    if (disp) {
      console.log("Rewards Contract Welsh Balance After:", poolInfoAfter.value.value["welsh-balance"].value);
      console.log("Rewards Contract Street Balance After:", poolInfoAfter.value.value["street-balance"].value);
    }

    // Verify balances are unchanged (since wallet1 claimed 0)
    expect(poolInfoAfter.value.value["welsh-balance"].value).toEqual(
      poolInfo.value.value["welsh-balance"].value
    );
    expect(poolInfoAfter.value.value["street-balance"].value).toEqual(
      poolInfo.value.value["street-balance"].value
    );

      // BONUS: Check deployer's rewards (they have all the LP tokens)
      if (disp) { console.log("\n=== BONUS: Check Deployer's Rewards (LP Token Holder) ==="); }

    const deployerLPBalance = simnet.callReadOnlyFn(
      "welsh-street-liquidity",
      "get-balance",
      [Cl.standardPrincipal(deployer)],
      deployer
    );

    const deployerRewardInfo = simnet.callReadOnlyFn(
      "welsh-street-rewards",
      "get-reward-user-balances",
      [Cl.standardPrincipal(deployer)],
      deployer
    );

    if (disp) {
      console.log("Deployer LP Balance:", deployerLPBalance.result);
      console.log("Deployer Reward Info:", JSON.stringify(deployerRewardInfo.result, null, 2));
    }
  })
})