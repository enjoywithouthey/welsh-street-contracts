import { Cl } from "@stacks/transactions";
import { describe, it } from "vitest";
import { disp } from "../vitestconfig"

import {
  getCurrentEpoch,
  getDecimals,
  getName,
  getSymbol,
  getTokenUri,
  getTotalSupply,
} from "./__functions__";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;

describe("=== READ ONLY ===", () => {
  it("=== GET CURRENT EPOCH ===", () => {
    getCurrentEpoch(deployer, 0, disp)
  });
  
  it("=== GET DECIMALS ===", () => {
    getDecimals(deployer, "liquidity", 6, disp)
  });

  it("=== GET NAME ===", () => {
    getName(deployer, "liquidity", "Welsh Street Liquidity Token", disp)
  });
  
  it("=== GET SYMBOL ===", () => {
    getSymbol(deployer, "liquidity", "CRED", disp)
  });
  
  it("=== GET TOKEN URI ===", () => {
    getTokenUri(deployer, "street-token", "", disp)
  });
  
  it("=== GET TOTAL SUPPLY ===", () => {
    getTotalSupply(deployer, "street-token", 0n, disp)
  });
});