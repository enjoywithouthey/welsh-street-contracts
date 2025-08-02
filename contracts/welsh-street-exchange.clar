;; Welsh Street Exchange by @enjoywithouthey
(use-trait sip-010 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE.sip-010-trait-ft-standard.sip-010-trait)

(define-constant ERR_NOT_CONTRACT_OWNER (err u601))
(define-constant ERR_NOT_TOKEN_OWNER (err u602))
(define-constant ERR_NOT_INITIALIZED (err u603))
(define-constant ERR_SLIPPAGE_EXCEEDED (err u604))
(define-constant ERR_ZERO_AMOUNT (err u605))
(define-constant ERR_NO_TOKEN_TO_BURN (err u606))
(define-constant ERR_TOKEN_SUPPLY_NOT_AVAILABLE (err u607))

(define-constant CONTRACT_OWNER tx-sender)
(define-constant INITIALIZE_RATIO u100) ;; 1 token-a : 100 token-b
(define-constant SLIPPAGE_BASIS u10000)
(define-constant TAX u1000) ;; 10% tax on liquidity withdrawals

(define-data-var is-initialized bool false)
(define-data-var reserve-a uint u0)
(define-data-var reserve-b uint u0)
(define-data-var swap-fee uint u990) ;; 1%

(define-public (burn-liquidity (amount uint))
  (let (
      (contract-principal (as-contract tx-sender))
      (burn-balance (unwrap! (as-contract (contract-call? .welsh-street-liquidity get-balance contract-principal)) (err u110)))
    )
    (begin
      (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_NOT_CONTRACT_OWNER)
      (asserts! (> amount u0) ERR_ZERO_AMOUNT)
      (asserts! (>= burn-balance amount) ERR_NO_TOKEN_TO_BURN)
      (as-contract (contract-call? .welsh-street-liquidity burn amount))
    )
  )
)

;; #[allow(unchecked_data)]
(define-public (initial-liquidity (amount-a uint))
  (let (
    (amount-b (* amount-a INITIALIZE_RATIO))
    (amount-lp (sqrti (* amount-a amount-b)))
  )
    (begin
      (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_NOT_CONTRACT_OWNER)
      (asserts! (is-eq (var-get is-initialized) false) ERR_NOT_INITIALIZED)
      (asserts! (> amount-a u0) ERR_ZERO_AMOUNT)
      (try! (as-contract (contract-call? .welsh-street-liquidity mint amount-lp)))
      (try! (contract-call? .welshcorgicoin transfer amount-a tx-sender .welsh-street-exchange none))
      (try! (contract-call? .street-token transfer amount-b tx-sender .welsh-street-exchange none))

      (var-set reserve-a amount-a)
      (var-set reserve-b amount-b)
      (var-set is-initialized true)

      (ok { added-a: amount-a, added-b: amount-b, minted-lp: amount-lp })
    )
  )
)

;; #[allow(unchecked_data)]
(define-public (provide-liquidity (amount-a uint))
  (begin
    (asserts! (is-eq (var-get is-initialized) true) ERR_NOT_INITIALIZED)
    (let (
      (res-a (var-get reserve-a))
      (res-b (var-get reserve-b))
      (lp-supply (unwrap! (contract-call? .welsh-street-liquidity get-total-supply) ERR_TOKEN_SUPPLY_NOT_AVAILABLE))
      (amount-b (/ (* amount-a res-b) res-a))
      (lp-from-a (/ (* amount-a lp-supply) res-a))
      (lp-from-b (/ (* amount-b lp-supply) res-b))
      (amount-lp (if (< lp-from-a lp-from-b) lp-from-a lp-from-b))
    )
    (begin
      (try! (contract-call? .welsh-street-liquidity mint amount-lp))
      (try! (contract-call? .welshcorgicoin transfer amount-a tx-sender .welsh-street-exchange none))
      (try! (contract-call? .street-token transfer amount-b tx-sender .welsh-street-exchange none))
      (var-set reserve-a (+ res-a amount-a))
      (var-set reserve-b (+ res-b amount-b))
      (ok { added-a: amount-a, 
            added-b: amount-b, 
            minted-lp: amount-lp })
      )
    )
  )
)

;; #[allow(unchecked_data)]
(define-public (remove-liquidity (amount-lp uint))
  (let (
    (res-a (var-get reserve-a))
    (res-b (var-get reserve-b))
    (lp-supply (unwrap! (contract-call? .welsh-street-liquidity get-total-supply) ERR_TOKEN_SUPPLY_NOT_AVAILABLE))
    (tax-lp (/ (* amount-lp TAX) u10000)) ;; TAX is in basis points (e.g., 1000 = 10%)
    (user-lp (- amount-lp tax-lp))
    (amount-a (/ (* user-lp res-a) lp-supply))
    (amount-b (/ (* user-lp res-b) lp-supply))
  )
    (begin
      (asserts! (> amount-lp u0) ERR_ZERO_AMOUNT)
      (try! (contract-call? .welsh-street-liquidity transfer amount-lp tx-sender .welsh-street-exchange none))
      (try! (as-contract (contract-call? .welsh-street-liquidity burn user-lp)))
      (try! (as-contract (contract-call? .welsh-street-liquidity burn tax-lp)))
      (try! (transformer .welshcorgicoin amount-a tx-sender))
      (try! (transformer .street-token amount-b tx-sender))

      (var-set reserve-a (if (>= res-a amount-a) (- res-a amount-a) u0))
      (var-set reserve-b (if (>= res-b amount-b) (- res-b amount-b) u0))
      (ok { burned-lp: user-lp,
            taxed-lp: tax-lp,
            user-a: amount-a,
            user-b: amount-b
      })
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
      (asserts! (>= b-out-net min-acceptable) ERR_SLIPPAGE_EXCEEDED)
      (try! (contract-call? .welshcorgicoin transfer a-in tx-sender .welsh-street-exchange none))
      (try! (contract-call? .welshcorgicoin transfer a-fee tx-sender .welsh-street-rewards none))
      (try! (contract-call? .street-token transfer b-fee tx-sender .welsh-street-rewards none))
      (try! (contract-call? .street-token transfer b-out-net .welsh-street-exchange tx-sender none))
      (try! (contract-call? .welsh-street-rewards update-rewards-a a-fee))
      (try! (contract-call? .welsh-street-rewards update-rewards-b b-fee))
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
      (asserts! (>= a-out-net min-acceptable) ERR_SLIPPAGE_EXCEEDED)
      (try! (contract-call? .street-token transfer b-in tx-sender .welsh-street-exchange none))
      (try! (contract-call? .street-token transfer b-fee tx-sender .welsh-street-rewards none))
      (try! (contract-call? .welshcorgicoin transfer a-fee tx-sender .welsh-street-rewards none))
      (try! (contract-call? .welshcorgicoin transfer a-out-net .welsh-street-exchange tx-sender none))
      (try! (contract-call? .welsh-street-rewards update-rewards-a a-fee))
      (try! (contract-call? .welsh-street-rewards update-rewards-b b-fee))

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

(define-public (get-liquidity-name)
  (ok (unwrap! (contract-call? .welsh-street-liquidity get-name) (err u999)))
)

(define-public (transformer
    (token <sip-010>)
    (amount uint)
    (to principal)
  )
  (as-contract (contract-call? token transfer amount tx-sender to none))
)