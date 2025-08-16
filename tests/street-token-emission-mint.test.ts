import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";
import { disp,
  EMISSION_AMOUNT 
} from "../vitestconfig"

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;

describe("street token emission minting", () => {
  it("emission mint until epochs reached", () => {
    for (let i = 0; i < 14; i++) { // change EMISSION_EPOCHS in contract for testing
      const epoch = simnet.callReadOnlyFn(
        "street-token",
        "get-current-epoch",
        [],
        deployer);

      expect(epoch.result).toEqual(Cl.ok(Cl.uint(i)))
      if (disp) console.log("current-epoch: ", i)
      
      const result = simnet.callPublicFn(
        "street-token",
        "emission-mint",
        [],
        deployer
      );

      if (result.result.type === "err") {
        expect(result.result).toEqual(Cl.error(Cl.uint(905)));
        if (disp) console.log(`emission-mint #${i + 1}: ERROR`, JSON.stringify(result.result, null, 2));
        break; // Stop the loop if you want to stop on error
      } else {
        expect(result.result).toEqual(
          Cl.ok(
            Cl.tuple({
              "circulating-supply": Cl.uint(BigInt((i + 1) * EMISSION_AMOUNT)),
              "emission-amount": Cl.uint(EMISSION_AMOUNT),
              "emission-block": Cl.uint(i + 3),
              "epochs-completed": Cl.uint(i + 1),
            })
          )
        );
        if (disp) console.log(`emission-mint #${i + 1}:`, JSON.stringify(result.result, null, 2));
      }

      const mineEmptyBurnBlock = simnet.mineEmptyBurnBlock();
      expect(mineEmptyBurnBlock).toBeDefined();
      if (disp) console.log(`Mined empty burn block #${i + 1}`);
    }
  }); 

  it("emission mint until total supply reached", () => {
    for (let i = 0; i < 13; i++) { // change epochs in contract for testing
      const result = simnet.callPublicFn(
        "street-token",
        "emission-mint",
        [],
        deployer
      );

      if (result.result.type === "err") {
        expect(result.result).toEqual(Cl.error(Cl.uint(903)));
        if (disp) console.log(`emission-mint #${i + 1}: ERROR`, JSON.stringify(result.result, null, 2));
        break; // 
      } else {
        expect(result.result).toEqual(
          Cl.ok(
            Cl.tuple({
              "circulating-supply": Cl.uint(BigInt((i + 1) * EMISSION_AMOUNT)),
              "emission-amount": Cl.uint(EMISSION_AMOUNT),
              "emission-block": Cl.uint(i + 3),
              "epochs-completed": Cl.uint(i + 1),
            })
          )
        );
        if (disp) console.log(`emission-mint #${i + 1}:`, JSON.stringify(result.result, null, 2));
      }

      const mineEmptyBurnBlock = simnet.mineEmptyBurnBlock();
      expect(mineEmptyBurnBlock).toBeDefined();
      if (disp) console.log(`Mined empty burn block #${i + 1}`);
      if (disp) {
        const rewardPoolInfo = simnet.callReadOnlyFn(
          "welsh-street-rewards",
          "get-reward-pool-info",
          [],
          deployer
        );
        console.log("Reward Pool Info:", JSON.stringify(rewardPoolInfo.result, null, 2));
      }
    }

  }); 
});