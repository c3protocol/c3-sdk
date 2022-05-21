"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.C3RequestOp = void 0;
// !!!!
// Input types to prepareC3Op
// !!!!
// TODO: Relate these with the delegation system
var C3RequestOp;
(function (C3RequestOp) {
    C3RequestOp["CE_Deposit"] = "deposit";
    C3RequestOp["CE_Withdraw"] = "withdraw";
    C3RequestOp["CE_Lend"] = "lend";
    C3RequestOp["CE_Redeem"] = "redeem";
    C3RequestOp["CE_Borrow"] = "borrow";
    C3RequestOp["CE_Repay"] = "repay";
    C3RequestOp["CE_Liquidate"] = "liquidate";
    C3RequestOp["ADE_Register"] = "register";
    C3RequestOp["ADE_Revoke"] = "revoke";
})(C3RequestOp = exports.C3RequestOp || (exports.C3RequestOp = {}));
//# sourceMappingURL=C3RequestTypes.js.map