;; title: welsh-street-rewards
;; description: collects the swap fees from the exchange and the $STREET mints into a reward pool for $CRED holders.

(define-constant CONTRACT_OWNER tx-sender)

(define-constant ERR_NOT_CONTRACT_OWNER (err u801))
(define-constant ERR_SUPPLY_NOT_AVAILABLE (err u802))
(define-constant ERR_STREET_BALANCE_NOT_AVAILABLE (err u803))
(define-constant ERR_WELSH_BALANCE_NOT_AVAILABLE (err u804))
(define-constant ERR_LIQUIDITY_BALANCE_NOT_AVAILABLE (err u805))

(define-data-var total-lp-supply uint u0)
(define-data-var rewards-street-balance uint u0)
(define-data-var rewards-welsh-balance uint u0)

(define-data-var total-a-in-contract uint u0) ;; total rewards in contract
(define-data-var total-b-in-contract uint u0) ;; total rewards in contract

(define-data-var total-a-per-share uint u0) ;; multiplied by 10^6 for precision
(define-data-var total-b-per-share uint u0) ;; multiplied by 10^6 for precision

(define-map user-info
  { account: principal }
  {
    lp-amount: uint,
    reward-debt-a: uint,
    reward-debt-b: uint,
  }
)

;; #[allow(unchecked_data)]
(define-public (update-rewards-a (amount uint))
  (let (
     (total-lp (unwrap! (contract-call? .welsh-street-liquidity get-total-supply) ERR_SUPPLY_NOT_AVAILABLE ))
    )
    (begin
      (asserts! (> total-lp u0) (err u100))
      ;; scale factor to avoid precision loss
      (var-set total-a-per-share
        (+ (var-get total-a-per-share) (/ (* amount u1000000) total-lp) )
      )
      (var-set total-a-in-contract (+ (var-get total-a-in-contract) amount))
      (ok true)
    )
  )
)

;; #[allow(unchecked_data)]
(define-public (update-rewards-b (amount uint))
  (let (
     (total-lp (unwrap! (contract-call? .welsh-street-liquidity get-total-supply) ERR_SUPPLY_NOT_AVAILABLE ))
     (current-rewards (unwrap! (contract-call? .welsh-street-token get-balance .welsh-street-rewards) ERR_SUPPLY_NOT_AVAILABLE ))
    )
    (begin
      (asserts! (> total-lp u0) (err u100))
      ;; scale factor to avoid precision loss
      (var-set total-b-per-share
        (+ (var-get total-b-per-share) (/ (* amount u1000000) total-lp) )
      )
      (var-set total-b-in-contract (+ (var-get total-b-in-contract) (+ current-rewards amount)))
      (ok true)
    )
  )
)

(define-public (claim)
  (let (
    (info (unwrap! (map-get? user-info { account: tx-sender }) (err u104)))
    (lp (get lp-amount info))
    (debt-a (get reward-debt-a info))
    (debt-b (get reward-debt-b info))
    (rps-a (var-get total-a-per-share))
    (rps-b (var-get total-b-per-share))
    (acc-a (/ (* lp rps-a) u1000000))
    (acc-b (/ (* lp rps-b) u1000000))
    (claim-a (if (> acc-a debt-a) (- acc-a debt-a) u0))
    (claim-b (if (> acc-b debt-b) (- acc-b debt-b) u0))
  )
    (begin
      (if (> claim-a u0)
        (try! (contract-call? .welshcorgicoin transfer claim-a .welsh-street-rewards tx-sender none))
        true
      )
      (if (> claim-b u0)
        (try! (contract-call? .welsh-street-token transfer claim-b .welsh-street-rewards tx-sender none))
        true
      )
      (map-set user-info { account: tx-sender } {
        lp-amount: lp,
        reward-debt-a: acc-a,
        reward-debt-b: acc-b
      })
      (ok { claimed-a: claim-a, claimed-b: claim-b })
    )
  )
)


(define-private (get-total-lp-supply)
  (let (
      (total-supply (unwrap! (contract-call? .welsh-street-liquidity get-total-supply) ERR_SUPPLY_NOT_AVAILABLE ))
    )
    (begin
      (var-set total-lp-supply total-supply)
      (ok {total-lp-supply: total-supply})
    )
  )
)

(define-private (get-reward-pool-balances)
    (let (
        (street-balance (unwrap! (contract-call? .welsh-street-token get-balance (as-contract tx-sender)) ERR_STREET_BALANCE_NOT_AVAILABLE ))
        (welsh-balance (unwrap! (contract-call? .welshcorgicoin get-balance (as-contract tx-sender)) ERR_WELSH_BALANCE_NOT_AVAILABLE ))
    )
    (begin 
        (var-set rewards-street-balance street-balance)
        (var-set rewards-welsh-balance welsh-balance)
         (ok {reward-pool-welsh-balance: welsh-balance, reward-pool-street-balance: street-balance})
    )
    )
)