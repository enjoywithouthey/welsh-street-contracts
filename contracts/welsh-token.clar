(impl-trait 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE.sip-010-trait-ft-standard.sip-010-trait)

(define-fungible-token welsh-token)

(define-constant ERR_NOT_CONTRACT_OWNER (err u600))
(define-constant ERR_NOT_TOKEN_OWNER (err u601))

(define-constant CONTRACT_OWNER tx-sender)
(define-constant TOKEN_URI u"")
(define-constant TOKEN_NAME "Welsh Token")
(define-constant TOKEN_SYMBOL "WELSH")
(define-constant TOKEN_DECIMALS u6)

(define-public (mint)
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_NOT_CONTRACT_OWNER)
    (ft-mint? welsh-token u10000000000000000 tx-sender)
  )
)

(define-public (transfer
    (amount uint)
    (sender principal)
    (recipient principal)
    (memo (optional (buff 34)))
  )
  (begin
    ;; #[filter(amount, recipient)]
    (asserts! (is-eq tx-sender sender) ERR_NOT_TOKEN_OWNER )
    (try! (ft-transfer? welsh-token amount sender recipient))
    (match memo
      to-print (print to-print)
      0x
    )
    (ok true)
  )
)

(define-read-only (get-balance (who principal))
  (ok (ft-get-balance welsh-token who)))

(define-read-only (get-total-supply)
  (ok (ft-get-supply welsh-token)))

(define-read-only (get-name)
  (ok TOKEN_NAME))

(define-read-only (get-symbol)
  (ok TOKEN_SYMBOL))

(define-read-only (get-decimals)
  (ok TOKEN_DECIMALS))

(define-read-only (get-token-uri) 
  (ok (some TOKEN_URI)))