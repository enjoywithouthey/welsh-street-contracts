(define-public (withdraw-fees (amount uint))
  (begin
    ;; WARNING: make sure that you check the caller here, or else anyone
    ;; can withdraw fees from the DEX contract.

    (asserts! (> amount u0) (err u400))
    (asserts! (<= amount (var-get sbtc-fee-pool)) (err u401))

    ;; Send sBTC from this DEX contract to the caller
    (try! (as-contract (contract-call? SBTC_CONTRACT
      transfer amount tx-sender recipient none
    )))

    ;; Subtract withdrawn amount from fee pool
    (var-set sbtc-fee-pool (- (var-get sbtc-fee-pool) amount))

    (ok amount)
  )
)