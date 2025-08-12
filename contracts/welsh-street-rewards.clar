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

(define-data-var total-lp-supply uint u0)
(define-data-var rewards-street-balance uint u0)
(define-data-var rewards-welsh-balance uint u0)
(define-data-var total-a-in-contract uint u0)
(define-data-var total-b-in-contract uint u0)
(define-data-var total-a-per-share uint u0)
(define-data-var total-b-per-share uint u0)

(define-map user-info
  { account: principal }
  {
    lp-amount: uint,
    reward-debt-a: uint,
    reward-debt-b: uint,
  }
)

;; Add these data variables to track pending rewards
(define-data-var pending-rewards-a uint u0)
(define-data-var pending-rewards-b uint u0)

(define-public (distribute-pending-rewards)
  (let (
    (total-lp (unwrap! (contract-call? .welsh-street-liquidity get-total-supply) ERR_SUPPLY_NOT_AVAILABLE))
    (pending-a (var-get pending-rewards-a))
    (pending-b (var-get pending-rewards-b))
  )
    (begin
      (asserts! (is-eq contract-caller .welsh-street-exchange) ERR_NOT_CONTRACT_OWNER)
      (if (and (> total-lp u0) (> pending-a u0))
        (begin
          (var-set total-a-per-share
            (+ (var-get total-a-per-share) (/ (* pending-a DECIMALS) total-lp)))
          (var-set pending-rewards-a u0))
        true)
      (if (and (> total-lp u0) (> pending-b u0))
        (begin
          (var-set total-b-per-share
            (+ (var-get total-b-per-share) (/ (* pending-b DECIMALS) total-lp)))
          (var-set pending-rewards-b u0))
        true)
      (ok true)
    )
  )
)

;; #[allow(unchecked_data)]
(define-public (update-rewards-a (amount uint))
  (let (
     (total-lp (unwrap! (contract-call? .welsh-street-liquidity get-total-supply) ERR_SUPPLY_NOT_AVAILABLE ))
     (current-rewards (unwrap! (contract-call? .welshcorgicoin get-balance .welsh-street-rewards) ERR_WELSH_BALANCE_NOT_AVAILABLE ))
    )
    (begin
      (if (> total-lp u0)
        (begin
          ;; Distribute any pending rewards plus new rewards
          (let ((total-to-distribute (+ amount (var-get pending-rewards-a))))
            (var-set total-a-per-share
              (+ (var-get total-a-per-share) (/ (* total-to-distribute DECIMALS) total-lp)))
            (var-set pending-rewards-a u0))) ;; Clear pending rewards
        ;; If no LP tokens exist, add to pending rewards
        (var-set pending-rewards-a (+ (var-get pending-rewards-a) amount)))
      
      (var-set total-a-in-contract (+ (var-get total-a-in-contract) (+ current-rewards amount)))
      (ok true)
    )
  )
)

;; #[allow(unchecked_data)]
(define-public (update-rewards-b (amount uint))
  (let (
     (total-lp (unwrap! (contract-call? .welsh-street-liquidity get-total-supply) ERR_SUPPLY_NOT_AVAILABLE ))
     (current-balance (unwrap! (contract-call? .street-token get-balance .welsh-street-rewards) ERR_SUPPLY_NOT_AVAILABLE ))
     (tracked-balance (var-get total-b-in-contract))
     ;; Calculate untracked emissions automatically
     (untracked-emissions (if (> current-balance tracked-balance) 
                            (- current-balance tracked-balance) 
                            u0))
     ;; Total new rewards = swap fees + any untracked emissions
     (total-new-rewards (+ amount untracked-emissions))
    )
    (begin
      (if (> total-lp u0)
        (begin
          ;; Distribute pending rewards + new rewards (including emissions)
          (let ((total-to-distribute (+ total-new-rewards (var-get pending-rewards-b))))
            (var-set total-b-per-share
              (+ (var-get total-b-per-share) (/ (* total-to-distribute DECIMALS) total-lp)))
            (var-set pending-rewards-b u0)))
        ;; If no LP tokens exist, add to pending rewards
        (var-set pending-rewards-b (+ (var-get pending-rewards-b) total-new-rewards)))
        
      ;; Update tracked balance to current balance (includes emissions)
      (var-set total-b-in-contract current-balance)
      (ok true)
    )
  )
)

(define-public (claim)
  (let (
    (current-lp (unwrap! (contract-call? .welsh-street-liquidity get-balance tx-sender) ERR_LIQUIDITY_BALANCE_NOT_AVAILABLE))
    (info (default-to {lp-amount: u0, reward-debt-a: u0, reward-debt-b: u0} 
                     (map-get? user-info { account: tx-sender })))
    (debt-a (get reward-debt-a info))
    (debt-b (get reward-debt-b info))
    (rps-a (var-get total-a-per-share))
    (rps-b (var-get total-b-per-share))
    (acc-a (/ (* current-lp rps-a) DECIMALS)) ;; Use current LP balance
    (acc-b (/ (* current-lp rps-b) DECIMALS))
    (claim-a (if (> acc-a debt-a) (- acc-a debt-a) u0))
    (claim-b (if (> acc-b debt-b) (- acc-b debt-b) u0))
  )
    (begin
      (print {claim-a: claim-a})
      (if (> claim-a u0)
        (try! (transformer .welshcorgicoin claim-a tx-sender))
        true
      )
      (print {claim-b: claim-b})
      (if (> claim-b u0)
        (try! (transformer .street-token claim-b tx-sender))
        true
      )
      (map-set user-info { account: tx-sender } {
        lp-amount: current-lp,  ;; Update with current balance
        reward-debt-a: acc-a,
        reward-debt-b: acc-b
      })
      (ok { claimed-a: claim-a, claimed-b: claim-b })
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
      (street-balance (unwrap! (contract-call? .street-token get-balance (as-contract tx-sender)) ERR_STREET_BALANCE_NOT_AVAILABLE ))
      (welsh-balance (unwrap! (contract-call? .welshcorgicoin get-balance (as-contract tx-sender)) ERR_WELSH_BALANCE_NOT_AVAILABLE ))
    )
    (begin 
      (var-set rewards-street-balance street-balance)
      (var-set rewards-welsh-balance welsh-balance)
      (ok {reward-pool-street-balance: street-balance, reward-pool-welsh-balance: welsh-balance,})
    )
  )
)

(define-read-only (get-reward-pool-info)
  (let (
    (street-balance (unwrap! (contract-call? .street-token get-balance (as-contract tx-sender)) ERR_STREET_BALANCE_NOT_AVAILABLE))
    (welsh-balance (unwrap! (contract-call? .welshcorgicoin get-balance (as-contract tx-sender)) ERR_WELSH_BALANCE_NOT_AVAILABLE))
  )
    (ok {
      street-balance: street-balance,
      total-a-in-contract: (var-get total-a-in-contract),
      total-a-per-share: (var-get total-a-per-share),
      total-b-in-contract: (var-get total-b-in-contract),
      total-b-per-share: (var-get total-b-per-share),
      welsh-balance: welsh-balance
    })
  )
)

(define-read-only (get-reward-user-balances (user principal))
  (let (
    (current-lp (unwrap! (contract-call? .welsh-street-liquidity get-balance user) ERR_LIQUIDITY_BALANCE_NOT_AVAILABLE))
    (info (default-to {lp-amount: u0, reward-debt-a: u0, reward-debt-b: u0} 
                     (map-get? user-info { account: user })))
    (debt-a (get reward-debt-a info))
    (debt-b (get reward-debt-b info))
    (rps-a (var-get total-a-per-share))
    (rps-b (var-get total-b-per-share))
    (acc-a (/ (* current-lp rps-a) DECIMALS))  
    (acc-b (/ (* current-lp rps-b) DECIMALS))
    (unclaimed-a (if (> acc-a debt-a) (- acc-a debt-a) u0))
    (unclaimed-b (if (> acc-b debt-b) (- acc-b debt-b) u0))
  )
    (ok {
      accumulated-a: acc-a,
      accumulated-b: acc-b,
      current-lp-amount: current-lp,
      reward-debt-a: debt-a,
      reward-debt-b: debt-b,
      stored-lp-amount: (get lp-amount info), 
      total-a-per-share: rps-a,
      total-b-per-share: rps-b,
      unclaimed-a: unclaimed-a,
      unclaimed-b: unclaimed-b
    })
  )
)
