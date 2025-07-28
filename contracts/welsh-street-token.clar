;; Welsh Street Token by @enjoywithouthey
(impl-trait 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE.sip-010-trait-ft-standard.sip-010-trait)

(define-fungible-token street-token)

(define-constant ERR_NOT_CONTRACT_OWNER (err u901))
(define-constant ERR_NOT_TOKEN_OWNER (err u902))
(define-constant ERR_EXCEEDS_TOTAL_SUPPLY (err u903))
(define-constant ERR_NO_MORE_BULK_MINTS (err u904))
(define-constant ERR_EMISSION_EPOCHS (err u905))
(define-constant ERR_EMISSION_INTERVAL (err u906))

(define-constant CONTRACT_OWNER tx-sender)
(define-constant TOKEN_URI u"")
;; (define-data-var TOKEN_URI (optional (string-utf8 256)) (some u"")

(define-constant TOKEN_NAME "Welsh Street Token")
(define-constant TOKEN_SYMBOL "STREET")
(define-constant TOKEN_DECIMALS u6) ;;1.000_000 = 1 token
(define-constant TOKEN_SUPPLY u10000000000000000)
(define-constant BULK_MINT_QTY u1000000000000000)
(define-constant BULK_MINT_CAP u4)
(define-constant EMISSION_EPOCHS u3) ;;420000 on mainnet
(define-constant EMISSION_INTERVAL u1)

(define-data-var bulk-mint-counter uint u0)
(define-data-var emission-epoch uint u0)
(define-data-var emission-amount uint u100)
(define-data-var last-mint-block uint u1)
(define-data-var circulating-supply uint u0)

(define-private (mint (amount uint))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_NOT_CONTRACT_OWNER)
    (asserts! (<= (+ (ft-get-supply street-token) amount) TOKEN_SUPPLY) ERR_EXCEEDS_TOTAL_SUPPLY)
    (ft-mint? street-token amount tx-sender)
  )
)

(define-public (bulk-mint)
  (begin
    (asserts! (< (var-get bulk-mint-counter) BULK_MINT_CAP) ERR_NO_MORE_BULK_MINTS)
    (try! (mint BULK_MINT_QTY))
    (var-set bulk-mint-counter (+ (var-get bulk-mint-counter) u1))
    (var-set circulating-supply (+ (var-get circulating-supply) BULK_MINT_QTY))
    (ok {bulk-mints-remaining: (- BULK_MINT_CAP (var-get bulk-mint-counter)), circulating-supply: (var-get circulating-supply)})     
  )
)

(define-public (emission-mint)
  (let (
      (current-block burn-block-height)
      (last-mint (var-get last-mint-block))
      (amount (var-get emission-amount))
    )
    (begin
      (asserts! (not (is-eq current-block last-mint)) ERR_EMISSION_INTERVAL)
      (asserts! (< (var-get emission-epoch) EMISSION_EPOCHS) ERR_EMISSION_EPOCHS)
      (try! (mint amount))
      (var-set circulating-supply (+ (var-get circulating-supply) amount))
      (var-set emission-epoch (+ (var-get emission-epoch) u1))
      (var-set last-mint-block current-block)
      (ok { circulating-supply: (var-get circulating-supply), emission-amount: amount, emission-block: current-block, epochs-completed: (var-get emission-epoch) })
    )
  )
)

;; Sender must be the same as the caller to prevent principals from transferring tokens they do not own.
(define-public (transfer
    (amount uint)
    (sender principal)
    (recipient principal)
    (memo (optional (buff 34)))
  ) ;; 34
  (begin
    ;; #[filter(amount, recipient)]
    (asserts! (is-eq tx-sender sender) ERR_NOT_TOKEN_OWNER)
    (try! (ft-transfer? street-token amount sender recipient))
    (match memo
      memo-content (print memo-content)
      0x
    )
    (ok true)
  )
)

(define-read-only (get-balance (who principal))
  (ok (ft-get-balance street-token who)))

(define-read-only (get-total-supply)
  (ok (ft-get-supply street-token)))

(define-read-only (get-circulating-supply)
  (ok (var-get circulating-supply)))

(define-read-only (get-current-epoch)
  (ok (var-get emission-epoch)))

(define-read-only (get-name)
  (ok TOKEN_NAME))

(define-read-only (get-symbol)
  (ok TOKEN_SYMBOL))

(define-read-only (get-decimals)
  (ok TOKEN_DECIMALS))

(define-read-only (get-token-uri) 
  (ok (some TOKEN_URI)))

;; SIP-010 function: Returns the URI containing token metadata
;; (define-read-only (get-token-uri)
;;   (ok (var-get TOKEN_URI))
;; )

;; (define-public (set-token-uri (value (string-utf8 256)))
;;   (begin 
;;     (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_NOT_CONTRACT_OWNER)  
;;     (var-set TOKEN_URI (some value))
;;     (ok (print {
;;           notification: "token-metadata-update",
;;           payload: {
;;             contract-id: (as-contract tx-sender),
;;             token-class: "ft"
;;         }
;;       })
;;     )
;;   )
;; )