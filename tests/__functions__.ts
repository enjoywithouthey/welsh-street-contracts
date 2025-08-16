import { Cl } from "@stacks/transactions";
import { expect } from "vitest";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;

export function communityMint(
    sender: any,
    amount: number,
    supply: number,
    cap: number,
    success: boolean,
    disp: boolean,
    ){
  const communityMint = simnet.callPublicFn(
    "street-token",
    "community-mint",
    [Cl.uint(amount)],
    sender
  );
  if (amount <= 0){
    expect(communityMint.result).toEqual(Cl.error(Cl.uint(1)));
    if (disp) {console.log("communityMintStreet:", communityMint.result)}
    return 
  }

  if (sender != deployer) {
    expect(communityMint.result).toEqual(Cl.error(Cl.uint(901)));
    if (disp) {console.log("communityMintStreet:", communityMint.result)}
    return
  }
  if (success)  {
    expect(communityMint.result).toEqual(
      Cl.ok(
        Cl.tuple({
          "community-mint": Cl.uint(amount),
        })
      )
    );
      if (disp && 'value' in communityMint.result) {console.log("communityMintStreet:", communityMint.result.value)}
  } else {
      expect(communityMint.result).toEqual(Cl.error(Cl.uint(904))
    );
      if (disp) {console.log("communityMintStreet:", communityMint.result)}
  }
}

export function lockLiquidity(
    sender: any,
    welsh: number,
    disp: boolean
    ){
    const street = welsh * 100  
    const liquidity = simnet.callPublicFn( 
        "welsh-street-exchange",
        "lock-liquidity",
        [Cl.uint(welsh)],
        sender);
    expect(liquidity.result).toEqual(
    Cl.ok(
        Cl.tuple({
        "locked-a": Cl.uint(welsh),
        "locked-b": Cl.uint(street),
        })
        )
    )
    if (disp && 'value' in liquidity.result){console.log("lockLiquidity:", liquidity.result.value)}
}

export function provideLiquidity(
  sender: any,
  welsh: number,
  resA: number,
  resB: number,
  disp: boolean
  ){
    const street = welsh * 100
    const cred = Math.floor(Math.sqrt(welsh * street));
    const liquidity = simnet.callPublicFn( 
      "welsh-street-exchange",
      "provide-liquidity",
      [Cl.uint(welsh)],
      sender);
    if (resA == 0 || resB == 0){
        expect(liquidity.result).toEqual(Cl.error(Cl.uint(603)))
        if (disp && 'value' in liquidity.result){console.log("providedLiquidity:", liquidity.result.value)}
        return
    }
    if (resA > 0 && resB > 0){
    expect(liquidity.result).toEqual(
    Cl.ok(
        Cl.tuple({
        "added-a": Cl.uint(welsh),
        "added-b": Cl.uint(street),
        "minted-lp": Cl.uint(cred)
        })
        )
    )
    if (disp && 'value' in liquidity.result){console.log("providedLiquidity:", liquidity.result.value)}
  }
}

export function removeLiquidity(
  sender: any,
  amountLp: number,
  userLp: number,
  taxLp: number,
  expectedA: number,
  expectedB: number,
  disp: boolean,
  ){
    const liquidity = simnet.callPublicFn( 
    "welsh-street-exchange",
    "remove-liquidity",
    [Cl.uint(amountLp)],
    sender);
  expect(liquidity.result).toEqual(
    Cl.ok(
      Cl.tuple({
        "burned-lp": Cl.uint(userLp),
        "taxed-lp": Cl.uint(taxLp),
        "user-a": Cl.uint(expectedA),
        "user-b": Cl.uint(expectedB),
      })
    )
  );
  if (disp && 'value' in liquidity.result){
    console.log("removeLiquidity", liquidity.result.value);}
}

export function swapAB(
  caller: any,
  welshAmount: number,
  slip: number,
  slipMax: number,
  aIn: number,
  bOutNet: number,
  aFee: number,
  bFee: number,
  disp: boolean
  ){
  const welsh2StreetSwap = simnet.callPublicFn(
    "welsh-street-exchange",
    "swap-a-b",
    [
      Cl.uint(welshAmount),
      Cl.uint(slipMax),
    ],
    caller);

  if (slip <= slipMax) {
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
      Cl.error(Cl.uint(604))
    );
    if (disp) {console.log("ERR_SLIPPAGE_EXCEEDED:", Cl.uint(604))}
  }
}

export function transfer(
  token: string,
  sender: any,
  recipient: any,
  amount: number,
  disp: boolean
  ){
  const transfer = simnet.callPublicFn(
    token,
    "transfer",
    [
      Cl.uint(amount),
      Cl.standardPrincipal(sender),
      Cl.standardPrincipal(recipient),
      Cl.none(),
    ],
    sender);
  expect(transfer.result).toBeOk(Cl.bool(true));
  if (disp) {console.log("transfer:", token, transfer.result)} 
}

export function getBalance(
  sender: any,
  token: string,
  amount: number,
  disp: boolean
  ){
  let principal; let caller;
  if (sender.address && sender.contractName) {
      principal = Cl.contractPrincipal(sender.address, sender.contractName);
      caller = sender.address
  } else {
    principal = Cl.standardPrincipal(sender);
    caller = sender
  }

  const balance = simnet.callReadOnlyFn(
    token,
    "get-balance",
    [principal],
    caller
  );
  expect(balance.result).toBeOk(Cl.uint(amount));
  if (disp && 'value' in balance.result) {
      console.log(caller.slice(-4),":", token, "balance:", balance.result.value
    );
  }
}

export function getCirculatingSupply(
  caller: any,
  expected: bigint,
  disp: boolean,
  ){
  const circulatingSupply = simnet.callReadOnlyFn(
    "street-token",
    "get-circulating-supply",
    [],
    caller);
    expect(circulatingSupply.result).toBeOk(Cl.uint(expected))
    if (disp){console.log("circulatingSupply:",circulatingSupply.result)}
}

export function getCommunityMinted(
  caller: any,
  expected: bigint,
  disp: boolean,
  ){
  const communityMinted = simnet.callReadOnlyFn(
    "street-token",
    "get-community-minted",
    [],
    caller);
    expect(communityMinted.result).toBeOk(Cl.uint(expected))
    if (disp && 'value' in communityMinted.result){console.log("communityMinted:",communityMinted.result.value)}
}