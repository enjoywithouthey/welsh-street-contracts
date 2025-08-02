import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;

describe("liquidity read only functions", () => {
  it("get-name", () => {
    const getName = simnet.callReadOnlyFn(
      "welsh-street-liquidity",
      "get-name",
      [],
      deployer);
  
      expect(getName.result).toBeOk(Cl.stringAscii("Welsh Street Liquidity Token"))
  });
  
  it("get-symbol", () => {
    const getSymbol = simnet.callReadOnlyFn(
      "welsh-street-liquidity",
      "get-symbol",
      [],
      deployer);
  
      expect(getSymbol.result).toBeOk(Cl.stringAscii("CRED"))
  }); 

  it("get-decimals", () => {
    const getDecimals = simnet.callReadOnlyFn(
      "welsh-street-liquidity",
      "get-decimals",
      [],
      deployer);
  
      expect(getDecimals.result).toBeOk(Cl.uint(6))
  });
  
//    it("get-token-uri", () => {
//     const getTokenUri = simnet.callReadOnlyFn(
//       "welsh-street-liquidity",
//       "get-token-uri",
//       [],
//       deployer);
  
//       expect(getTokenUri.result).toBeOk(Cl.stringAscii("NEED URI"))
//   }); 

});