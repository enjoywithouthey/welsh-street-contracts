;; title: Welsh Street Token
;; description: $STREET is the rewards token for the Welsh Street Exchange.

(impl-trait 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE.sip-010-trait-ft-standard.sip-010-trait)
;; (impl-trait .welsh-street-transformer-trait.transformer-trait)
;; (use-trait transformer-trait .welsh-street-transformer-trait.transformer-trait)

(define-fungible-token street-token)

(define-constant ERR_NOT_CONTRACT_OWNER (err u901))
(define-constant ERR_NOT_TOKEN_OWNER (err u902))
(define-constant ERR_EXCEEDS_TOTAL_SUPPLY (err u903))
(define-constant ERR_NO_MORE_COMMUNITY_MINT (err u904))
(define-constant ERR_EMISSION_EPOCHS (err u905))
(define-constant ERR_EMISSION_INTERVAL (err u906))

(define-constant CONTRACT_OWNER tx-sender)
(define-constant TOKEN_URI u"")
;; (define-data-var TOKEN_URI (optional (string-utf8 256)) (some u"")

(define-constant TOKEN_NAME "Welsh Street Token")
(define-constant TOKEN_SYMBOL "STREET")
(define-constant TOKEN_DECIMALS u6)
(define-constant TOKEN_SUPPLY u10000000000000000) ;;10_000_000_000
(define-constant COMMUNITY_MINT_CAP u4000000000000000) ;;4_000_000_000
(define-constant EMISSION_EPOCHS u13) ;;420000 on mainnet
(define-constant EMISSION_INTERVAL u1)

(define-data-var emission-epoch uint u0)
(define-data-var emission-amount uint u1000000000000000) ;;THIS VALUE FOR TESTING need halving equation
(define-data-var last-mint-block uint u1)
(define-data-var circulating-supply uint u0)
(define-data-var community-minted uint u0)

(define-public (community-mint (amount uint))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_NOT_CONTRACT_OWNER)
    (asserts! (<= (+ (ft-get-supply street-token) amount) TOKEN_SUPPLY) ERR_EXCEEDS_TOTAL_SUPPLY)
    (asserts! (<= (var-get community-minted) COMMUNITY_MINT_CAP) ERR_NO_MORE_COMMUNITY_MINT)
    (try! (ft-mint? street-token amount tx-sender))
    (var-set community-minted (+ (var-get community-minted) amount))
    (var-set circulating-supply (+ (var-get circulating-supply) amount))
    (ok {community-mint-remaining: (- COMMUNITY_MINT_CAP (var-get community-minted)), circulating-supply: (var-get circulating-supply)})     
  )
)

(define-public (emission-mint)
  (let (
      (current-block burn-block-height)
      (last-mint (var-get last-mint-block))
      (amount (var-get emission-amount))
    )
    (begin
      (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_NOT_CONTRACT_OWNER)
      (asserts! (<= (+ (ft-get-supply street-token) amount) TOKEN_SUPPLY) ERR_EXCEEDS_TOTAL_SUPPLY)
      (asserts! (not (is-eq current-block last-mint)) ERR_EMISSION_INTERVAL)
      (asserts! (< (var-get emission-epoch) EMISSION_EPOCHS) ERR_EMISSION_EPOCHS)
      (try! (ft-mint? street-token amount .welsh-street-rewards))
      (var-set circulating-supply (+ (var-get circulating-supply) amount))
      (var-set emission-epoch (+ (var-get emission-epoch) u1))
      (var-set last-mint-block current-block)
      (ok { circulating-supply: (var-get circulating-supply), emission-amount: amount, emission-block: current-block, epochs-completed: (var-get emission-epoch) })
    )
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
    (asserts! (is-eq tx-sender sender) ERR_NOT_TOKEN_OWNER)
    (try! (ft-transfer? street-token amount sender recipient))
    (match memo
      memo-content (print memo-content)
      0x
    )
    (ok true)
  )
)

(define-read-only (get-circulating-supply)
  (ok (var-get circulating-supply)))

(define-read-only (get-current-epoch)
  (ok (var-get emission-epoch)))

(define-read-only (get-balance (who principal))
  (ok (ft-get-balance street-token who)))

(define-read-only (get-total-supply)
  (ok (ft-get-supply street-token)))

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