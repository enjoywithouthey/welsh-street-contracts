# welsh-street-contracts
Welsh Street Clarity contracts and Stacks backend.

# street token

## test functions
(contract-call? .welsh-street-token get-circulating-supply)
(contract-call? .welsh-street-token bulk-mint)
(contract-call? .welsh-street-token get-total-supply)

## test supply, advance chain
(contract-call? .welsh-street-token get-circulating-supply)
(contract-call? .welsh-street-token get-current-epoch)
(contract-call? .welsh-street-token emission-mint)
::advance_burn_chain_tip 1 

## test transfer
(contract-call? .welsh-street-token get-circulating-supply)
(contract-call? .welsh-street-token emission-mint)
(contract-call? .welsh-street-token transfer u50 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM 'ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5 (some 0x000000000000000000000000000000000000000000000000000000000000000000))

::get_assets_maps
::set_tx_sender ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5

(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.welsh-street-token emission-mint)
::advance_burn_chain_tip 1


# rewards token

## test mint
(contract-call? .welsh-street-token emission-mint)
::get_assets_maps

# provide liquidity
(contract-call? .welsh-street-token bulk-mint)
::get_assets_maps

(contract-call? .welsh-street-liquidity mint u100 .welsh-street-exchange)

(contract-call? .welsh-street-exchange initial-liquidity u100) 