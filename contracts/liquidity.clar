;; Welsh Street Liquidity 
;; by @enjoywithouthey

(impl-trait 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE.sip-010-trait-ft-standard.sip-010-trait)

(define-fungible-token cred-token)

(define-constant ERR_NOT_CONTRACT_OWNER (err u701))
(define-constant ERR_NOT_TOKEN_OWNER (err u702))
(define-constant ERR_FORCE_KNOWN_ERROR (err u703))
(define-constant ERR_NEGATIVE_BURN (err u704))

(define-constant CONTRACT_OWNER tx-sender)
(define-constant TOKEN_URI u"")
(define-constant TOKEN_NAME "Welsh Street Liquidity Token")
(define-constant TOKEN_SYMBOL "CRED")
(define-constant TOKEN_DECIMALS u6)

(define-data-var provider-count uint u0)
(define-map balances-lp { account: principal } uint)

;; #[allow(unchecked_data)]
(define-public (mint (amount uint))
  (let (
      (balance-prev (default-to u0 (map-get? balances-lp { account: tx-sender })))
      (balance-new (+ balance-prev amount))
    )
    (begin
      (asserts! (is-eq contract-caller .exchange) ERR_NOT_CONTRACT_OWNER)
      (try! (ft-mint? cred-token amount tx-sender))
      (try! (update-balance-lp tx-sender balance-new))
      (ok {minted: amount})
    )
  )
)

;; #[allow(unchecked_data)]
(define-public (burn (amount uint))
  (let (
    (balance-prev (default-to u0 (map-get? balances-lp { account: tx-sender })))
    (balance-new (- balance-prev amount))
  )
    (begin
      (asserts! (>= balance-prev amount) ERR_NEGATIVE_BURN)
      (try! (update-balance-lp tx-sender balance-new))
      (try! (ft-burn? cred-token amount tx-sender))
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
    ;; #[filter(amount, contract-caller)]
    (asserts! (is-eq tx-sender sender) ERR_NOT_TOKEN_OWNER)
    (let (
      (sender-prev (default-to u0 (map-get? balances-lp { account: sender })))
      (recipient-prev (default-to u0 (map-get? balances-lp { account: recipient })))
      (sender-new (- sender-prev amount))
      (recipient-new (+ recipient-prev amount))
    )
      (begin
        (asserts! (>= sender-prev amount) ERR_NEGATIVE_BURN)
        (try! (update-balance-lp sender sender-new))
        (try! (update-balance-lp recipient recipient-new))
        (try! (ft-transfer? cred-token amount sender recipient))
        (match memo
          memo-content (print memo-content)
          0x
        )
        (ok true)
      )
    )
  )
)

(define-private (update-balance-lp (user principal) (amount uint))
  (let (
      (balance-prev (default-to u0 (map-get? balances-lp { account: user })))
    )
    (begin
      (if (and (> amount u0) (is-eq balance-prev u0))
        (var-set provider-count (+ (var-get provider-count) u1))
        true
      )

      (if (and (is-eq amount u0) (> balance-prev u0))
        (var-set provider-count (- (var-get provider-count) u1))
        true
      )

      (if (> amount u0)
        (map-set balances-lp { account: user } amount)
        (map-delete balances-lp { account: user })
      )

      (if false
        ERR_FORCE_KNOWN_ERROR
      (ok true)
      )
    )
  )
)

(define-read-only (get-user-balance-lp (user principal))
  (ok (default-to u0 (map-get? balances-lp { account: user }))))

(define-read-only (get-provider-count)
  (ok (var-get provider-count)))

(define-read-only (get-balance (who principal))
  (ok (ft-get-balance cred-token who)))

(define-read-only (get-total-supply)
  (ok (ft-get-supply cred-token)))

(define-read-only (get-name)
  (ok TOKEN_NAME))

(define-read-only (get-symbol)
  (ok TOKEN_SYMBOL))

(define-read-only (get-decimals)
  (ok TOKEN_DECIMALS))

(define-read-only (get-token-uri) 
  (ok (some TOKEN_URI)))