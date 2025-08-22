;; Welsh Street Rewards
;; by @enjoywithouthey

(use-trait sip-010 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE.sip-010-trait-ft-standard.sip-010-trait)

(define-constant CONTRACT_OWNER tx-sender)

(define-constant ERR_NOT_CONTRACT_OWNER (err u801))
(define-constant ERR_SUPPLY_NOT_AVAILABLE (err u802))
(define-constant ERR_STREET_BALANCE_NOT_AVAILABLE (err u803))
(define-constant ERR_WELSH_BALANCE_NOT_AVAILABLE (err u804))
(define-constant ERR_LIQUIDITY_BALANCE_NOT_AVAILABLE (err u805))

(define-constant DECIMALS u1000000)

(define-data-var pending-a uint u0)
(define-data-var pending-b uint u0)
(define-data-var share-a uint u0) ;; a per share
(define-data-var share-b uint u0) ;; b per share

(define-map user-rewards
  { account: principal }
  {
    amount-lp: uint,
    debt-a: uint,
    debt-b: uint,
  }
)

(define-public (claim-rewards)
  (let (
    (amount-lp (unwrap! (contract-call? .liquidity get-balance tx-sender) ERR_LIQUIDITY_BALANCE_NOT_AVAILABLE))
    (info (default-to {
      amount-lp: u0,
      debt-a: u0,
      debt-b: u0} 
      (map-get? user-rewards { account: tx-sender })))
    (acc-a (/ (* amount-lp (var-get share-a)) DECIMALS))
    (acc-b (/ (* amount-lp (var-get share-b)) DECIMALS))
    (deb-a (get debt-a info))
    (deb-b (get debt-b info))
    (claim-a (if (> acc-a deb-a) (- acc-a deb-a) u0))
    (claim-b (if (> acc-b deb-b) (- acc-b deb-b) u0))
  )
    (begin
      (if (> claim-a u0)
        (try! (transformer .welshcorgicoin claim-a tx-sender))
        true
      )
      (if (> claim-b u0)
        (try! (transformer .street-token claim-b tx-sender))
        true
      )
      (map-set user-rewards { account: tx-sender } {
        amount-lp: amount-lp, 
        debt-a: acc-a, 
        debt-b: acc-b})
      (ok {
        amount-lp: amount-lp, 
        claimed-a: claim-a, 
        claimed-b: claim-b, 
        debt-a: acc-a, 
        debt-b: acc-b })
    )
  )
)

;; #[allow(unchecked_data)]
(define-public (update-rewards-a (amount uint))
  (let (
     (total-lp (unwrap! (contract-call? .liquidity get-total-supply) ERR_SUPPLY_NOT_AVAILABLE ))
     (current-rewards (unwrap! (contract-call? .welshcorgicoin get-balance .rewards) ERR_WELSH_BALANCE_NOT_AVAILABLE ))
    )
    (begin
      (if (> total-lp u0)
        (begin
          ;; Distribute any pending rewards plus new rewards
          (let ((updated-pending (+ amount (var-get pending-a))))
            (var-set share-a (+ (var-get share-a) (/ (* updated-pending DECIMALS) total-lp)))
            (var-set pending-a u0))) ;; Clear pending rewards
        ;; If no LP tokens exist, add to pending rewards
        (var-set pending-a (+ (var-get pending-a) amount)))
      (ok true)
    )
  )
)

;; #[allow(unchecked_data)]
(define-public (update-rewards-b (amount uint))
  (let (
     (total-lp (unwrap! (contract-call? .liquidity get-total-supply) ERR_SUPPLY_NOT_AVAILABLE ))
     (current-rewards (unwrap! (contract-call? .street-token get-balance .rewards) ERR_STREET_BALANCE_NOT_AVAILABLE ))
   )
    (begin
      (if (> total-lp u0)
        (begin
          (let ((updated-pending (+ amount (var-get pending-b))))
            (var-set share-b (+ (var-get share-b) (/ (* updated-pending DECIMALS) total-lp)))
            (var-set pending-b u0)))
        (var-set pending-b (+ (var-get pending-b) amount)))
      (ok true)
    )
  )
)

(define-public (update-rewards-pending)
  (let (
    (total-lp (unwrap! (contract-call? .liquidity get-total-supply) ERR_SUPPLY_NOT_AVAILABLE))
    (pend-a (var-get pending-a))
    (pend-b (var-get pending-b))
  )
    (begin
      (asserts! (is-eq contract-caller .exchange) ERR_NOT_CONTRACT_OWNER)
      (if (and (> total-lp u0) (> pend-a u0))
        (begin
          (var-set share-a
            (+ (var-get share-a) (/ (* pend-a DECIMALS) total-lp)))
          (var-set pending-a u0))
        true)
      (if (and (> total-lp u0) (> pend-b u0))
        (begin
          (var-set share-b
            (+ (var-get share-b) (/ (* pend-b DECIMALS) total-lp)))
          (var-set pending-b u0))
        true)
      (ok true)
    )
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

(define-read-only (get-reward-pool-info)
    (ok {
      rewards-a: (unwrap-panic (contract-call? .welshcorgicoin get-balance .rewards)),
      rewards-b: (unwrap-panic (contract-call? .street-token get-balance .rewards)),
      share-a: (var-get share-a),
      share-b: (var-get share-b),
    })
)

(define-read-only (get-reward-user-info (user principal))
  (let (
    (amount-lp (unwrap! (contract-call? .liquidity get-balance user) ERR_LIQUIDITY_BALANCE_NOT_AVAILABLE))
    (info (default-to {
      amount-lp: u0,
      debt-a: u0,
      debt-b: u0} 
      (map-get? user-rewards { account: user })))
    (acc-a (/ (* amount-lp (var-get share-a)) DECIMALS))  
    (acc-b (/ (* amount-lp (var-get share-b)) DECIMALS))
    (deb-a (get debt-a info))
    (deb-b (get debt-b info))
    (unclaimed-a (if (> acc-a deb-a) (- acc-a deb-a) u0))
    (unclaimed-b (if (> acc-b deb-b) (- acc-b deb-b) u0))
  )
    (ok {
      amount-lp: amount-lp, ;; real-time LP balance
      reward-acc-a: acc-a,
      reward-acc-b: acc-b,
      debt-a: deb-a,
      debt-b: deb-b,
      unclaimed-a: unclaimed-a,
      unclaimed-b: unclaimed-b,
    })
  )
)