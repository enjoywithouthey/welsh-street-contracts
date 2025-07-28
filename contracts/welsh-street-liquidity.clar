(impl-trait 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE.sip-010-trait-ft-standard.sip-010-trait)

(define-fungible-token cred-lp-token)

(define-constant ERR_NOT_CONTRACT_OWNER (err u701))
(define-constant ERR_NOT_TOKEN_OWNER (err u702))
(define-constant ERR_ZERO_AMOUNT (err u703))

(define-constant CONTRACT_OWNER tx-sender)
(define-constant TOKEN_URI u"")
(define-constant TOKEN_NAME "Welsh Street Liquidity Token")
(define-constant TOKEN_SYMBOL "CRED")
(define-constant TOKEN_DECIMALS u6)

(define-data-var total-supply uint u0)

(define-map holders { account: principal } { balance: uint })

(define-public (burn (amount uint))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_NOT_CONTRACT_OWNER)
    (asserts! (> amount u0) ERR_ZERO_AMOUNT)
    (try! (ft-burn? cred-lp-token amount tx-sender))
    (var-set total-supply (- (var-get total-supply) amount))
    (ok amount)
  )
)

(define-public (mint (amount uint))
    (begin
      (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_NOT_CONTRACT_OWNER)
      (asserts! (> amount u0) ERR_ZERO_AMOUNT)
      (try! (ft-mint? cred-lp-token amount tx-sender))
      (var-set total-supply (+ (var-get total-supply) amount))
      (ok amount)
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