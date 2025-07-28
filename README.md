# welsh-street-contracts
Welsh Street Clarity contracts and Stacks backend.

# console commands

(contract-call? .street-token get-circulating-supply)
(contract-call? .street-token bulk-mint)
(contract-call? .street-token get-total-supply)

(contract-call? .street-token get-circulating-supply)
(contract-call? .street-token get-current-epoch)
(contract-call? .street-token emission-mint)
::advance_burn_chain_tip 1 

(contract-call? .street-token get-circulating-supply)
(contract-call? .street-token emission-mint)

(contract-call? .street-token transfer u50 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM 'ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5 (some 0x000000000000000000000000000000000000000000000000000000000000000000))

::get_assets_maps
::set_tx_sender ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5

(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.street-token emission-mint)
::advance_burn_chain_tip 1