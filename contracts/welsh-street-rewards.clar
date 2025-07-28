;; title: welsh-street-rewards
;; description: collects the swap fees from the exchange and the $STREET mints into a reward pool for $CRED holders.

(define-constant CONTRACT_OWNER tx-sender)
(define-constant REWARDS .welsh-street-rewards)
(define-constant TOKEN_A .welshcorgicoin)
(define-constant TOKEN_B .welsh-street-token)
(define-constant TOKEN_LP .welsh-street-liquidity)

(define-constant ERR_NOT_CONTRACT_OWNER (err u801))
(define-constant ERR_NOT_AVAILABLE (err u802))

(define-data-var total-supply-lp uint u0)
(define-data-var holder-lp-balance uint u0)
(define-data-var rewards-street-balance uint u0)
(define-data-var rewards-welsh-balance uint u0)

(define-private (get-total-supply)
  (let (
        (total-supply (unwrap! (contract-call? TOKEN_LP get-total-supply) ERR_NOT_AVAILABLE ))
    )
    (begin
      (var-set total-supply-lp total-supply)
      (ok {total-supply-lp: total-supply})
    )
  )
)

(define-private (get-reward-balances)
    (let (
        (street-balance (unwrap! (contract-call? TOKEN_B get-balance (as-contract tx-sender)) ERR_NOT_AVAILABLE ))
        (welsh-balance (unwrap! (contract-call? TOKEN_A get-balance (as-contract tx-sender)) ERR_NOT_AVAILABLE ))
    )
    (begin 
        (var-set rewards-street-balance street-balance)
        (var-set rewards-welsh-balance welsh-balance)
         (ok {rewards-welsh-balance: welsh-balance})
    )
    )
)

(define-private (get-holder-lp-balance)
  (let (
    (holder-balance (unwrap! (contract-call? TOKEN_LP get-balance tx-sender) ERR_NOT_AVAILABLE ))
    )
    (begin
        (var-set holder-lp-balance holder-balance)
        (ok {holder-lp-balance: holder-balance})
    )
  )
)

;; need to calculate the user's balance in the reward pool and write a claim function.