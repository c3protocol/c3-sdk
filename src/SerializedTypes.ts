
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// SERIALIZED DATA
// NOTE: ONLY APPEND TO THESE STRUCTURES, NEVER REMOVE FIELDS OR MODIFY EXISTING FIELDS
// Data in these fields are stored in the hash log and thus we need to be careful that updates
// do not break the decoding process so the full log can always be audited across the entire timeline
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

import { AssetId, Amount, UnixTimestamp, Signature, Price, Address } from "./types"

// TODO: Generate a test which we can run to ensure that all data in the existing hash logs
// can be decoded by the system so we never break access to part of the log

// This is the sturcture created by the users when they want to send an order to the server
export type OrderData = {
	user: Address,
	have_id: AssetId,
	want_id: AssetId,
	have_amount: Amount,
	want_amount: Amount,
	expiresOn: UnixTimestamp,
	// This is a locally generated timestamp created by the user
	// It's verified by the server to be inside a range close to server's time
	createdOn: UnixTimestamp
}

export type SignedOrder = {
	data: OrderData,
	signature: Signature
}

export type ServerOrder = {
	userOrder: SignedOrder,
	isBuy: boolean,
	baseId: AssetId,
	quoteId: AssetId,
	price: Price,
	amount: Amount,
	makerFees: Price,
	takerFees: Price,
	isMarket: boolean,
	addedOn: UnixTimestamp,
	proxyAddress: Address
}

export type CancelData = {
	user: Address,
	have_id: AssetId,
	have_amount: Amount,
	order_proxy: Address,
}

export type SignedCancel = {
	data: CancelData,
	signature: Signature,
}

export type CancelledOrder = {
	order: ServerOrder,
	cancelOn: UnixTimestamp,
	cancelTicket: SignedCancel,
	proxyAddress: Address,
}

export type Match = {
	buyOrder: ServerOrder,
	sellOrder: ServerOrder,
	matchOn: UnixTimestamp,
	matchBuyAmount: Amount,
	matchSellAmount: Amount,
	matchBuyFees: Amount,
	matchSellFees: Amount,
	matchPrice: Price,
	buyOrderFirstMatch: boolean,
	buyOrderCompleted: boolean,
	sellOrderFirstMatch: boolean,
	sellOrderCompleted: boolean
}
