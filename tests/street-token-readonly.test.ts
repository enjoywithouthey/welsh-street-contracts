import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;

describe("street token read only tests", () => {
  it("get-circulating-supply", () => {
    const getCirculatingSupply = simnet.callReadOnlyFn(
      "street-token",
      "get-circulating-supply",
      [],
      deployer);
  
      expect(getCirculatingSupply.result).toBeOk(Cl.uint(0))
  });

    it("get-current-epoch", () => {
    const getCurrentEpoch = simnet.callReadOnlyFn(
      "street-token",
      "get-current-epoch",
      [],
      deployer);
  
      expect(getCurrentEpoch.result).toBeOk(Cl.uint(0))
  });
  
  it("get-total-supply", () => {
    const getTotalSupply = simnet.callReadOnlyFn(
      "street-token",
      "get-total-supply",
      [],
      deployer);
  
      expect(getTotalSupply.result).toBeOk(Cl.uint(0))
  });

  it("get-name", () => {
    const getName = simnet.callReadOnlyFn(
      "street-token",
      "get-name",
      [],
      deployer);
  
      expect(getName.result).toBeOk(Cl.stringAscii("Welsh Street Token"))
  });
  
  it("get-symbol", () => {
    const getSymbol = simnet.callReadOnlyFn(
      "street-token",
      "get-symbol",
      [],
      deployer);
  
      expect(getSymbol.result).toBeOk(Cl.stringAscii("STREET"))
  }); 

  it("get-decimals", () => {
    const getDecimals = simnet.callReadOnlyFn(
      "street-token",
      "get-decimals",
      [],
      deployer);
  
      expect(getDecimals.result).toBeOk(Cl.uint(6))
  });
  
//    it("get-token-uri", () => {
//     const getTokenUri = simnet.callReadOnlyFn(
//       "street-token",
//       "get-token-uri",
//       [],
//       deployer);
  
//       expect(getTokenUri.result).toBeOk(Cl.stringAscii("NEED URI"))
//   }); 

});