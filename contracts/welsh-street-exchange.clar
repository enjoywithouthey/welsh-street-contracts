;; Welsh Street Exchange by @enjoywithouthey
(define-constant ERR_NOT_CONTRACT_OWNER (err u601))
(define-constant ERR_NOT_TOKEN_OWNER (err u602))
(define-constant ERR_INITIALIZED (err u603))
(define-constant ERR_SLIPPAGE_EXCEEDED (err u604))

(define-constant CONTRACT_OWNER tx-sender)
(define-constant REWARDS .welsh-street-rewards)
(define-constant TOKEN_A .welshcorgicoin)
(define-constant TOKEN_B .welsh-street-token)
(define-constant TOKEN_LP .welsh-street-liquidity)
(define-constant RATIO u100) ;; 1 token-a : 100 token-b
(define-constant SLIPPAGE_BASIS u10000)
(define-constant TAX u10000) ;; 10% tax on liquidity withdrawals

(define-data-var is-initialized bool false)
(define-data-var reserve-a uint u0)
(define-data-var reserve-b uint u0)
(define-data-var swap-fee uint u990) ;; 1%

;; #[allow(unchecked_data)]
(define-public (initial-liquidity (amount-a uint))
  (let (
    (amount-b (* amount-a RATIO))
    (amount-lp (* amount-a amount-b))
  )
    (begin
      (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_NOT_CONTRACT_OWNER)
      (asserts! (is-eq (var-get is-initialized) false) ERR_INITIALIZED)
      (try! (contract-call? TOKEN_LP mint amount-lp))
      (try! (contract-call? TOKEN_LP transfer amount-lp tx-sender (as-contract tx-sender) none))
      (try! (contract-call? TOKEN_A transfer amount-a tx-sender (as-contract tx-sender) none))
      (try! (contract-call? TOKEN_B transfer amount-b tx-sender (as-contract tx-sender) none))

      (var-set reserve-a amount-a)
      (var-set reserve-b amount-b)
      (var-set is-initialized true)

      (ok { added-a: amount-a, added-b: amount-b })
    )
  )
)

;; #[allow(unchecked_data)]
(define-public (provide-liquidity (amount-a uint) (amount-lp uint))
  (let (
    (res-a (var-get reserve-a))
    (res-b (var-get reserve-b))
    (lp-supply (unwrap! (contract-call? TOKEN_LP get-total-supply) (err u110)))
    (amount-b (/ (* amount-a res-b) res-a))
  )
    (begin
      (try! (contract-call? TOKEN_LP mint amount-lp))
      (try! (contract-call? TOKEN_LP transfer amount-lp (as-contract tx-sender) tx-sender none))
      (try! (contract-call? TOKEN_A transfer amount-a tx-sender (as-contract tx-sender) none))
      (try! (contract-call? TOKEN_B transfer amount-b tx-sender (as-contract tx-sender) none))

      ;; External contract mints LP token, assume it matches amount-lp
      (var-set reserve-a (+ res-a amount-a))
      (var-set reserve-b (+ res-b amount-b))

      (ok { amount-a: amount-a, amount-b: amount-b, minted: amount-lp })
    )
  )
)

;; #[allow(unchecked_data)]
(define-public (remove-liquidity (amount-lp uint))
  (let (
    (res-a (var-get reserve-a))
    (res-b (var-get reserve-b))
    (lp-supply (unwrap! (contract-call? TOKEN_LP get-total-supply) (err u110)))
    (amount-a (/ (* amount-lp res-a) lp-supply))
    (amount-b (/ (* amount-lp res-b) lp-supply))
    (tax-a (/ (* amount-a TAX) u10000))
    (tax-b (/ (* amount-b TAX) u10000))
    (user-a (- amount-a tax-a))
    (user-b (- amount-b tax-b))
  )
    (begin
      (try! (contract-call? TOKEN_LP transfer amount-lp tx-sender (as-contract tx-sender) none))
      (try! (contract-call? TOKEN_LP burn amount-lp))
      (try! (contract-call? TOKEN_A transfer user-a (as-contract tx-sender) tx-sender none))
      (try! (contract-call? TOKEN_B transfer user-b (as-contract tx-sender) tx-sender none))

      ;; Only the user's share is subtracted from reserves; tax stays in reserves
      (var-set reserve-a (- res-a user-a))
      (var-set reserve-b (- res-b user-b))
      (ok { amount-a: user-a, amount-b: user-b, tax-a: tax-a, tax-b: tax-b, burned: amount-lp })
    )
  )
)

;; #[allow(unchecked_data)]
(define-public (swap-a-for-b (a-in uint) (max-slippage-bps uint))
  (let (
    (res-a (var-get reserve-a))
    (res-b (var-get reserve-b))
    (fee (var-get swap-fee))
    (a-fee (- a-in (/ (* a-in fee) u1000))) ;; fee on a-in
    (a-in-net (- a-in a-fee))
    (a-in-with-fee (* a-in-net fee))
    (numerator (* a-in-with-fee res-b))
    (denominator (+ (* res-a u1000) a-in-with-fee))
    (b-out (/ numerator denominator))
    (b-fee (- b-out (/ (* b-out fee) u1000))) ;; fee on b-out
    (b-out-net (- b-out b-fee))
    (min-acceptable (/ (* b-out-net (- SLIPPAGE_BASIS max-slippage-bps)) SLIPPAGE_BASIS))
  )
    (begin
      (asserts! (>= b-out-net min-acceptable) ERR_SLIPPAGE_EXCEEDED )

      (try! (contract-call? TOKEN_A transfer a-in tx-sender (as-contract tx-sender) none))
      (try! (contract-call? TOKEN_A transfer a-fee (as-contract tx-sender) REWARDS none))
      (try! (contract-call? TOKEN_B transfer b-fee (as-contract tx-sender) REWARDS none))
      (try! (contract-call? TOKEN_B transfer b-out-net (as-contract tx-sender) tx-sender none))

      (var-set reserve-a (+ res-a a-in-net))
      (var-set reserve-b (- res-b b-out-net))

      (ok { swapped-in: a-in, swapped-out: b-out-net, fee-a: a-fee, fee-b: b-fee })
    )
  )
)

;; #[allow(unchecked_data)]
(define-public (swap-b-for-a (b-in uint) (max-slippage-bps uint))
  (let (
    (res-a (var-get reserve-a))
    (res-b (var-get reserve-b))
    (fee (var-get swap-fee))
    (b-fee (- b-in (/ (* b-in fee) u1000)))
    (b-in-net (- b-in b-fee))
    (b-in-with-fee (* b-in-net fee))
    (numerator (* b-in-with-fee res-a))
    (denominator (+ (* res-b u1000) b-in-with-fee))
    (a-out (/ numerator denominator))
    (a-fee (- a-out (/ (* a-out fee) u1000)))
    (a-out-net (- a-out a-fee))
    (min-acceptable (/ (* a-out-net (- SLIPPAGE_BASIS max-slippage-bps)) SLIPPAGE_BASIS))
  )
    (begin
      (asserts! (>= a-out-net min-acceptable) ERR_SLIPPAGE_EXCEEDED )

      (try! (contract-call? TOKEN_B transfer b-in tx-sender (as-contract tx-sender) none))
      (try! (contract-call? TOKEN_B transfer b-fee (as-contract tx-sender) REWARDS none))
      (try! (contract-call? TOKEN_A transfer a-fee (as-contract tx-sender) REWARDS none))
      (try! (contract-call? TOKEN_A transfer a-out-net (as-contract tx-sender) tx-sender none))

      (var-set reserve-b (+ res-b b-in-net))
      (var-set reserve-a (- res-a a-out-net))

      (ok { swapped-in: b-in, swapped-out: a-out-net, fee-b: b-fee, fee-a: a-fee })
    )
  )
)

;; #[allow(unchecked_data)]
(define-public (update-fee (new-fee uint))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_NOT_CONTRACT_OWNER)
    (var-set swap-fee new-fee)
    (ok {swap-fee: new-fee})
  )
)