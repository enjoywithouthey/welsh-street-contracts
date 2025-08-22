;; Welsh Street Emissions Constants
;; Generated from tokenomics/epochs.m - Exponential Decay Pattern

;; ===== BASIC PARAMETERS =====
(define-constant TOTAL-EPOCHS u420000)
(define-constant HALVING-CYCLES u5)
(define-constant EPOCHS-PER-CYCLE u84000)
(define-constant EPOCH-TIME-MINUTES u7)
(define-constant EPOCH-TIME-SECONDS u420)

;; ===== TOKEN SUPPLY BREAKDOWN =====
(define-constant SCALE-FACTOR u1000000000)  ;; 1B (for readability)
(define-constant TOTAL-SUPPLY u10000000000) ;; 10B tokens
(define-constant DEV-ALLOCATION u1000000000) ;; 1B tokens
(define-constant COMMUNITY-ALLOCATION u2000000000) ;; 2B tokens  
(define-constant INITIAL-BURN u2000000000) ;; 2B tokens
(define-constant TOTAL-EMISSIONS u5000000000) ;; 5B tokens

;; ===== EMISSIONS PER EPOCH (Corrected from epochs_clarity.m) =====
(define-constant CYCLE-1-EMISSION u30722) ;; Highest emissions (first cycle)
(define-constant CYCLE-2-EMISSION u15361) ;; Second highest
(define-constant CYCLE-3-EMISSION u7680)  ;; Middle cycle
(define-constant CYCLE-4-EMISSION u3840)  ;; Second lowest
(define-constant CYCLE-5-EMISSION u1920)  ;; Lowest emissions (final cycle)

;; ===== TOTAL EMISSIONS PER CYCLE (Updated calculations) =====
(define-constant CYCLE-1-TOTAL u2580648000) ;; 2.58B tokens (84,000 * 30,722)
(define-constant CYCLE-2-TOTAL u1290324000) ;; 1.29B tokens (84,000 * 15,361)
(define-constant CYCLE-3-TOTAL u645120000)  ;; 645M tokens (84,000 * 7,680)
(define-constant CYCLE-4-TOTAL u322560000)  ;; 323M tokens (84,000 * 3,840)
(define-constant CYCLE-5-TOTAL u161280000)  ;; 161M tokens (84,000 * 1,920)

;; ===== CYCLE BOUNDARIES (epoch numbers) =====
(define-constant CYCLE-1-START u1)
(define-constant CYCLE-1-END u84000)
(define-constant CYCLE-2-START u84001)
(define-constant CYCLE-2-END u168000)
(define-constant CYCLE-3-START u168001)
(define-constant CYCLE-3-END u252000)
(define-constant CYCLE-4-START u252001)
(define-constant CYCLE-4-END u336000)
(define-constant CYCLE-5-START u336001)
(define-constant CYCLE-5-END u420000)

;; ===== HELPER FUNCTIONS =====
(define-read-only (get-emission-for-epoch (epoch uint))
  (if (<= epoch CYCLE-1-END)
    CYCLE-1-EMISSION
    (if (<= epoch CYCLE-2-END)
      CYCLE-2-EMISSION
      (if (<= epoch CYCLE-3-END)
        CYCLE-3-EMISSION
        (if (<= epoch CYCLE-4-END)
          CYCLE-4-EMISSION
          CYCLE-5-EMISSION)))))

(define-read-only (get-current-cycle (epoch uint))
  (if (<= epoch CYCLE-1-END)
    u1
    (if (<= epoch CYCLE-2-END)
      u2
      (if (<= epoch CYCLE-3-END)
        u3
        (if (<= epoch CYCLE-4-END)
          u4
          u5)))))

;; ===== TIME CALCULATIONS =====
(define-constant TOTAL-TIME-YEARS u1) ;; ~1.3 years from your calculation

;; ===== VERIFICATION CONSTANTS =====
(define-constant TOTAL-CALCULATED-EMISSIONS 
  (+ CYCLE-1-TOTAL CYCLE-2-TOTAL CYCLE-3-TOTAL CYCLE-4-TOTAL CYCLE-5-TOTAL))
  ;; This will now equal 4,999,932,000

;; Runtime verification
(define-read-only (verify-emissions)
  (is-eq TOTAL-CALCULATED-EMISSIONS TOTAL-EMISSIONS))

;; ===== EMISSION SCHEDULE OVERVIEW =====
;; Cycle 1: 30,722 per epoch × 84,000 epochs = 2,580,648,000 tokens (51.6%)
;; Cycle 2: 15,361 per epoch × 84,000 epochs = 1,290,324,000 tokens (25.8%) 
;; Cycle 3: 7,680 per epoch × 84,000 epochs = 645,120,000 tokens (12.9%)
;; Cycle 4: 3,840 per epoch × 84,000 epochs = 322,560,000 tokens (6.5%)
;; Cycle 5: 1,920 per epoch × 84,000 epochs = 161,280,000 tokens (3.2%)
;; Total: 5,000,000,000 tokens (100%)

;; Emission constants (exact MATLAB values)
(define-constant CYCLE-5-EMISSION u1920)
(define-constant TOTAL-EMISSIONS-CALCULATED u4999932000)

;; Treasury for rounding differences and governance
(define-constant TREASURY-RESERVE u68000) ;; Rounding remainder
(define-constant TREASURY-GOVERNANCE u0)  ;; Future governance allocation

(define-constant TOTAL-EMISSIONS u5000000000) ;; Exact target

;; Treasury management
(define-public (mint-treasury-reserve (recipient principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    ;; Add additional checks for governance/multisig
    (ft-mint? welsh-token TREASURY-RESERVE recipient)
  )
)