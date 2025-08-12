;; Welsh Street Exchange
;; by @enjoywithouthey 

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
(define-constant FEE_BASIS u10000)
(define-constant TAX u1000) ;; 10% tax on liquidity withdrawals

(define-data-var is-initialized bool false)
(define-data-var reserve-a uint u0)
(define-data-var reserve-b uint u0)
(define-data-var swap-fee uint u50) ;; 50 is 0.5% at 10000 basis points, on each side = ~1 total

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
  )
    (begin
      (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_NOT_CONTRACT_OWNER)
      (asserts! (is-eq (var-get is-initialized) false) ERR_NOT_INITIALIZED)
      (asserts! (> amount-a u0) ERR_ZERO_AMOUNT)
      (try! (contract-call? .welshcorgicoin transfer amount-a tx-sender .welsh-street-exchange none))
      (try! (contract-call? .street-token transfer amount-b tx-sender .welsh-street-exchange none))
      (var-set reserve-a amount-a)
      (var-set reserve-b amount-b)
      (var-set is-initialized true)
      (print { added-a: amount-a, added-b: amount-b, minted-lp: u0 })
      (ok { added-a: amount-a, added-b: amount-b, minted-lp: u0 })
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
      ;; Handle first liquidity provider (LP supply = 0)
      (amount-lp (if (is-eq lp-supply u0)
                    (sqrti (* amount-a amount-b))  ;; First provider gets geometric mean
                    (let (
                      (lp-from-a (/ (* amount-a lp-supply) res-a))
                      (lp-from-b (/ (* amount-b lp-supply) res-b))
                    )
                    (if (< lp-from-a lp-from-b) lp-from-a lp-from-b))))
    )
    (begin
      (try! (contract-call? .welsh-street-liquidity mint amount-lp))
            ;; If this is the first LP provision (lp-supply was 0), distribute pending rewards
      (if (is-eq lp-supply u0)
        (begin
          (try! (contract-call? .welsh-street-rewards distribute-pending-rewards))
          true)
        true)
      (try! (contract-call? .welshcorgicoin transfer amount-a tx-sender .welsh-street-exchange none))
      (try! (contract-call? .street-token transfer amount-b tx-sender .welsh-street-exchange none))
      (var-set reserve-a (+ res-a amount-a))
      (var-set reserve-b (+ res-b amount-b))

    (ok { added-a: amount-a, added-b: amount-b, minted-lp: amount-lp })
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

(define-constant ERR_1 (err u991))
(define-constant ERR_2 (err u992))
(define-constant ERR_3 (err u993))
(define-constant ERR_4 (err u994))
(define-constant ERR_5 (err u995))
(define-constant ERR_6 (err u996))

;; #[allow(unchecked_data)]
(define-public (swap-a-b (a-in uint) (slip-max uint))
  (let (
    (res-a (var-get reserve-a))
    (res-b (var-get reserve-b))
    (exp (/ (* a-in res-b) res-a))
    (fee (var-get swap-fee))
    (a-fee (/ (* a-in fee) FEE_BASIS)) 
    (a-in-net (- a-in a-fee))
    (a-reward (/ a-fee u2))  
    (a-in-with-fee (* a-in-net (- FEE_BASIS fee)))
    (num (* a-in-with-fee res-b))
    (den (+ (* res-a FEE_BASIS) a-in-with-fee))
    (b-out (/ num den))
    (b-fee (/ (* b-out fee) FEE_BASIS)) 
    (b-out-net (- b-out b-fee))
    (b-reward (/ b-fee u2))
    (slip (/ (* (- exp b-out) FEE_BASIS) exp)) 
    (min-b (/ (* b-out (- FEE_BASIS slip-max)) FEE_BASIS))
  )
    (begin
      (print {res-a: res-a, res-b: res-b, slip: slip, slip-max: slip-max})
      (asserts! (<= slip slip-max) ERR_SLIPPAGE_EXCEEDED)
      (asserts! (is-ok (contract-call? .welshcorgicoin transfer a-in tx-sender .welsh-street-exchange none)) ERR_1)

      ;; Only transfer and update rewards if > 0
      (if (> b-reward u0)
        (begin
          (asserts! (is-ok (transformer .street-token b-reward .welsh-street-rewards)) ERR_2)
          (asserts! (is-ok (contract-call? .welsh-street-rewards update-rewards-b b-reward)) ERR_6))
        true)
      
      (if (> a-reward u0)
        (begin
          (asserts! (is-ok (transformer .welshcorgicoin a-reward .welsh-street-rewards)) ERR_3)
          (asserts! (is-ok (contract-call? .welsh-street-rewards update-rewards-a a-reward)) ERR_5))
        true)
      
      (asserts! (is-ok (transformer .street-token b-out-net tx-sender)) ERR_4)
      
      (var-set reserve-a (+ res-a a-in-net))
      (var-set reserve-b (- res-b b-out))
      (print {a-reward: a-reward, b-reward: b-reward})
      (print { act: b-out, exp: exp, slip: slip})
      (print { b-out: b-out, min-b: min-b })
      (ok { a-in: a-in, b-out-net: b-out-net, fee-a: a-fee, fee-b: b-fee })
    )
  )
)

;; (try! (transformer .street-token amount-b tx-sender))
;; #[allow(unchecked_data)]
(define-public (swap-b-a (b-in uint) (slip-max uint))
  (let (
    (res-a (var-get reserve-a))
    (res-b (var-get reserve-b))
    (exp (/ (* b-in res-a) res-b))
    (fee (var-get swap-fee))
    (b-fee (/ (* b-in fee) FEE_BASIS))
    (b-in-net (- b-in b-fee))
    (b-reward (/ b-fee u2))
    (b-in-with-fee (* b-in-net (- FEE_BASIS fee)))
    (num (* b-in-with-fee res-a))
    (den (+ (* res-b FEE_BASIS) b-in-with-fee))
    (a-out (/ num den))
    (a-fee (/ (* a-out fee) FEE_BASIS))
    (a-out-net (- a-out a-fee))
    (a-reward (/ a-fee u2))
    (slip (/ (* (- exp a-out) FEE_BASIS) exp))
  )
    (begin
      (asserts! (<= slip slip-max) ERR_SLIPPAGE_EXCEEDED)
      (asserts! (is-ok (contract-call? .street-token transfer b-in tx-sender .welsh-street-exchange none)) ERR_1)
      
      ;; Only transfer and update rewards if > 0
      (if (> b-reward u0)
        (begin
          (asserts! (is-ok (transformer .street-token b-reward .welsh-street-rewards)) ERR_2)
          (asserts! (is-ok (contract-call? .welsh-street-rewards update-rewards-b b-reward)) ERR_6))
        true)
      
      (if (> a-reward u0)
        (begin
          (asserts! (is-ok (transformer .welshcorgicoin a-reward .welsh-street-rewards)) ERR_3)
          (asserts! (is-ok (contract-call? .welsh-street-rewards update-rewards-a a-reward)) ERR_5))
        true)
      
      (asserts! (is-ok (transformer .welshcorgicoin a-out-net tx-sender)) ERR_4)
      
      (var-set reserve-b (+ res-b b-in-net))
      (var-set reserve-a (- res-a a-out))
      
      (ok { a-out-net: a-out-net, b-in: b-in, fee-a: a-fee, fee-b: b-fee })
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

;; #[allow(unchecked_data)]
(define-public (transformer
    (token <sip-010>)
    (amount uint)
    (to principal)
  )
  (as-contract (contract-call? token transfer amount tx-sender to none))
)