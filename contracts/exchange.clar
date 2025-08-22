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
(define-constant INITIAL_RATIO u100) ;; 1 token-a : 100 token-b
(define-constant FEE_BASIS u10000)
(define-constant TAX u1000) ;; 10% tax on liquidity withdrawals

(define-data-var reserve-a uint u0)
(define-data-var reserve-b uint u0)
(define-data-var fee-swap uint u50) ;; 50 is 0.5% at 10000 basis points, on each side = ~1 total

;; #[allow(unchecked_data)]
(define-public (lock-liquidity (amount-a uint))
  (let (
    (amount-b (* amount-a INITIAL_RATIO))
  )
    (begin
      (asserts! (> amount-a u0) ERR_ZERO_AMOUNT)
      (try! (contract-call? .welshcorgicoin transfer amount-a tx-sender .exchange none))
      (try! (contract-call? .street-token transfer amount-b tx-sender .exchange none))
      (var-set reserve-a (+ (var-get reserve-a) amount-a))
      (var-set reserve-b (+ (var-get reserve-b) amount-b))
      (print { locked-a: amount-a, locked-b: amount-b })
      (ok { 
        locked-a: amount-a, 
        locked-b: amount-b })
    )
  )
)

;; #[allow(unchecked_data)]
(define-public (provide-liquidity (amount-a uint))
  (begin  
    (asserts! (> (var-get reserve-a) u0) ERR_NOT_INITIALIZED)
    (asserts! (> (var-get reserve-b) u0) ERR_NOT_INITIALIZED)
    (let (
      (res-a (var-get reserve-a))
      (res-b (var-get reserve-b))
      (total-supply-lp (unwrap! (contract-call? .liquidity get-total-supply) ERR_TOKEN_SUPPLY_NOT_AVAILABLE))
      (amount-b (/ (* amount-a res-b) res-a))
      ;; Handle first liquidity provider (LP supply = 0)
      (amount-lp (if (is-eq total-supply-lp u0)
                    (sqrti (* amount-a amount-b))  ;; First provider gets geometric mean
                    (let (
                      (lp-from-a (/ (* amount-a total-supply-lp) res-a))
                      (lp-from-b (/ (* amount-b total-supply-lp) res-b))
                    )
                    (if (< lp-from-a lp-from-b) lp-from-a lp-from-b))))
    )
    (begin
      (try! (contract-call? .liquidity mint amount-lp))
            ;; If this is the first LP provision (total-supply-lp was 0), distribute pending rewards
      (if (is-eq total-supply-lp u0)
        (begin
          (try! (contract-call? .rewards update-rewards-pending))
          true)
        true)
      (try! (contract-call? .welshcorgicoin transfer amount-a tx-sender .exchange none))
      (try! (contract-call? .street-token transfer amount-b tx-sender .exchange none))
      (var-set reserve-a (+ res-a amount-a))
      (var-set reserve-b (+ res-b amount-b))

    (ok { 
      added-a: amount-a, 
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
    (total-supply-lp (unwrap! (contract-call? .liquidity get-total-supply) ERR_TOKEN_SUPPLY_NOT_AVAILABLE))
    (tax-lp (/ (* amount-lp TAX) u10000)) ;; TAX is in basis points (e.g., 1000 = 10%)
    (user-lp (- amount-lp tax-lp))
    (amount-a (/ (* user-lp res-a) total-supply-lp))
    (amount-b (/ (* user-lp res-b) total-supply-lp))
  )
    (begin
      (asserts! (> amount-lp u0) ERR_ZERO_AMOUNT)
      (try! (contract-call? .liquidity transfer amount-lp tx-sender .exchange none))
      (try! (as-contract (contract-call? .liquidity burn user-lp)))
      (try! (as-contract (contract-call? .liquidity burn tax-lp)))
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
(define-public (swap-a-b (amount-a uint) (slip-max uint))
  (let (
    (res-a (var-get reserve-a))
    (res-b (var-get reserve-b))
    (exp (/ (* amount-a res-b) res-a))
    (fee (var-get fee-swap))
    (fee-a (/ (* amount-a fee) FEE_BASIS)) 
    (amount-a-net (- amount-a fee-a))
    (reward-a (/ fee-a u2))  
    (amount-a-with-fee (* amount-a-net (- FEE_BASIS fee)))
    (num (* amount-a-with-fee res-b))
    (den (+ (* res-a FEE_BASIS) amount-a-with-fee))
    (amount-b (/ num den))
    (fee-b (/ (* amount-b fee) FEE_BASIS)) 
    (amount-b-net (- amount-b fee-b))
    (reward-b (/ fee-b u2))
    (slip (/ (* (- exp amount-b) FEE_BASIS) exp)) 
    (min-b (/ (* amount-b (- FEE_BASIS slip-max)) FEE_BASIS))
  )
    (begin
      (print {res-a: res-a, res-b: res-b, slip: slip, slip-max: slip-max})
      (asserts! (<= slip slip-max) ERR_SLIPPAGE_EXCEEDED)
      (asserts! (is-ok (contract-call? .welshcorgicoin transfer amount-a tx-sender .exchange none)) ERR_1)

      ;; Only transfer and update rewards if > 0
      (if (> reward-b u0)
        (begin
          (asserts! (is-ok (transformer .street-token reward-b .rewards)) ERR_2)
          (asserts! (is-ok (contract-call? .rewards update-rewards-b reward-b)) ERR_6))
        true)
      
      (if (> reward-a u0)
        (begin
          (asserts! (is-ok (transformer .welshcorgicoin reward-a .rewards)) ERR_3)
          (asserts! (is-ok (contract-call? .rewards update-rewards-a reward-a)) ERR_5))
        true)
      
      (asserts! (is-ok (transformer .street-token amount-b-net tx-sender)) ERR_4)
      
      (var-set reserve-a (+ res-a amount-a-net))
      (var-set reserve-b (- res-b amount-b))
      (print {reward-a: reward-a, reward-b: reward-b})
      (print { act: amount-b, exp: exp, slip: slip})
      (print { amount-b-net: amount-b-net, min-b: min-b })
      (ok { 
        amount-a: amount-a, 
        amount-b-net: amount-b-net, 
        fee-a: fee-a, 
        fee-b: fee-b })
    )
  )
)

;; (try! (transformer .street-token amount-b tx-sender))
;; #[allow(unchecked_data)]
(define-public (swap-b-a (amount-b uint) (slip-max uint))
  (let (
    (res-a (var-get reserve-a))
    (res-b (var-get reserve-b))
    (exp (/ (* amount-b res-a) res-b))
    (fee (var-get fee-swap))
    (fee-b (/ (* amount-b fee) FEE_BASIS))
    (amount-b-net (- amount-b fee-b))
    (reward-b (/ fee-b u2))
    (amount-b-with-fee (* amount-b-net (- FEE_BASIS fee)))
    (num (* amount-b-with-fee res-a))
    (den (+ (* res-b FEE_BASIS) amount-b-with-fee))
    (amount-a (/ num den))
    (fee-a (/ (* amount-a fee) FEE_BASIS))
    (amount-a-net (- amount-a fee-a))
    (reward-a (/ fee-a u2))
    (slip (/ (* (- exp amount-a) FEE_BASIS) exp))
    (min-a (/ (* amount-a (- FEE_BASIS slip-max)) FEE_BASIS))
  )
    (begin
      (asserts! (<= slip slip-max) ERR_SLIPPAGE_EXCEEDED)
      (asserts! (is-ok (contract-call? .street-token transfer amount-b tx-sender .exchange none)) ERR_1)
      
      ;; Only transfer and update rewards if > 0
      (if (> reward-b u0)
        (begin
          (asserts! (is-ok (transformer .street-token reward-b .rewards)) ERR_2)
          (asserts! (is-ok (contract-call? .rewards update-rewards-b reward-b)) ERR_6))
        true)
      
      (if (> reward-a u0)
        (begin
          (asserts! (is-ok (transformer .welshcorgicoin reward-a .rewards)) ERR_3)
          (asserts! (is-ok (contract-call? .rewards update-rewards-a reward-a)) ERR_5))
        true)
      
      (asserts! (is-ok (transformer .welshcorgicoin amount-a-net tx-sender)) ERR_4)
      
      (var-set reserve-b (+ res-b amount-b-net))
      (var-set reserve-a (- res-a amount-a))
      (print {reward-a: reward-a, reward-b: reward-b})
      (print { act: amount-a, exp: exp, slip: slip})
      (print { amount-a-net: amount-a-net, min-a: min-a })
      (ok { 
        amount-a-net: amount-a-net, 
        amount-b: amount-b, 
        fee-a: fee-a, 
        fee-b: fee-b })
    )
  )
)

;; #[allow(unchecked_data)]
(define-public (update-fee-swap (fee-swap-new uint))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_NOT_CONTRACT_OWNER)
    (var-set fee-swap fee-swap-new)
    (ok {fee-swap: fee-swap-new})
  )
)

;; #[allow(unchecked_data)]
(define-public (transformer
    (token <sip-010>)
    (amount uint)
    (to principal)
  )
  (as-contract (contract-call? token transfer amount tx-sender to none))
)

(define-read-only (get-locked-liquidity)
  (let (
    (res-a (var-get reserve-a))
    (res-b (var-get reserve-b))
    (total-supply-lp (unwrap-panic (contract-call? .liquidity get-total-supply)))
    (claimed-a (/ (* total-supply-lp res-a) total-supply-lp)) ;; All LP tokens can claim up to res-a
    (claimed-b (/ (* total-supply-lp res-b) total-supply-lp))
  )
    (ok { 
      locked-a: (- res-a claimed-a), 
      locked-b: (- res-b claimed-b) })
  )
)