(impl-trait 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE.sip-010-trait-ft-standard.sip-010-trait)

(define-fungible-token cred-lp-token)

(define-constant ERR_NOT_CONTRACT_OWNER (err u701))
(define-constant ERR_NOT_TOKEN_OWNER (err u702))
(define-constant ERR_ZERO_AMOUNT (err u703))
(define-constant ERR_FORCE_KNOWN_ERROR (err u704))
(define-constant ERR_NEGATIVE_BURN (err u705))

(define-constant CONTRACT_OWNER tx-sender)
(define-constant TOKEN_URI u"")
(define-constant TOKEN_NAME "Welsh Street Liquidity Token")
(define-constant TOKEN_SYMBOL "CRED")
(define-constant TOKEN_DECIMALS u6)

(define-data-var total-supply uint u0)

(define-data-var provider-count uint u0)

(define-map lp-balances { account: principal } uint)

(define-private (update-lp-balance (user principal) (amount uint))
    (begin
      (asserts! (>= amount u0) ERR_NEGATIVE_BURN)
      (if (> amount u0)
        (begin
          (map-set lp-balances { account: user } amount)
          (var-set provider-count (+ (var-get provider-count) u1))
        )
        true
      )

      (if (is-eq amount u0)
        (begin
          (map-delete lp-balances { account: user })
          (var-set provider-count (- (var-get provider-count) u1))
        )
        true
      )

      (if false
        ERR_FORCE_KNOWN_ERROR
        (ok true)
      )
    )
  )


;; #[allow(unchecked_data)]
(define-public (mint (recipient principal) (amount uint))
  (let (
      (prev-balance (default-to u0 (map-get? lp-balances { account: recipient })))
      (new-balance (+ prev-balance amount))
    )
    (begin
      (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_NOT_CONTRACT_OWNER)
      (asserts! (> amount u0) ERR_ZERO_AMOUNT)
      (try! (ft-mint? cred-lp-token amount recipient))
      (var-set total-supply (+ (var-get total-supply) amount))
      (try! (update-lp-balance recipient new-balance))
      (ok {minted: amount})
    )
  )
)

;; #[allow(unchecked_data)]
(define-public (burn (recipient principal) (amount uint))
  (let (
    (prev-balance (default-to u0 (map-get? lp-balances { account: recipient })))
    (new-balance (- prev-balance amount))
  )
    (begin
      (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_NOT_CONTRACT_OWNER)
      (asserts! (> amount u0) ERR_ZERO_AMOUNT)
      (asserts! (>= prev-balance amount) ERR_NEGATIVE_BURN)
      (try! (update-lp-balance recipient new-balance))
      (try! (ft-burn? cred-lp-token amount recipient))
      (var-set total-supply (- (var-get total-supply) amount))
      (ok {burned: amount})
    )
  )
)

;; #[allow(unchecked_data)]
(define-public (transfer
    (amount uint)
    (sender principal)
    (recipient principal)
    (memo (optional (buff 34)))
  )
  (begin
    ;; #[filter(amount, recipient)]
    (asserts! (is-eq tx-sender sender) ERR_NOT_TOKEN_OWNER)
    (try! (ft-transfer? cred-lp-token amount sender recipient))
    (match memo
      to-print (print to-print)
      0x
    )
    (ok true)
  )
)

(define-read-only (get-balance (who principal))
  (ok (ft-get-balance cred-lp-token who)))

(define-read-only (get-total-supply)
  (ok (ft-get-supply cred-lp-token)))

(define-read-only (get-name)
  (ok TOKEN_NAME))

(define-read-only (get-symbol)
  (ok TOKEN_SYMBOL))

(define-read-only (get-decimals)
  (ok TOKEN_DECIMALS))

(define-read-only (get-token-uri) 
  (ok (some TOKEN_URI)))

(define-read-only (get-provider-count)
  (ok (var-get provider-count))
)

(define-read-only (get-user-lp-balance (user principal))
  (default-to u0 (map-get? lp-balances { account: user }))
)