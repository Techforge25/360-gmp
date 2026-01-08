const { Router } = require("express");
const { authentication } = require("../middlewares/auth");
const {
    createConnectAccount,
    getConnectAccountStatus,
    releaseEscrowFunds,
    refundEscrowFunds,
    getEscrowTransaction
} = require("../controllers/escrowController");

// Router instance
const escrowRouter = Router();

// Stripe Connect Account Management
escrowRouter.route("/connect/create").post(authentication, createConnectAccount);
escrowRouter.route("/connect/status").get(authentication, getConnectAccountStatus);

// Escrow Transaction Management
escrowRouter.route("/transaction/:transactionId").get(authentication, getEscrowTransaction);

// Escrow Release & Refund (Protected routes - can add admin/seller authorization later)
escrowRouter.route("/release/:orderId").post(authentication, releaseEscrowFunds);
escrowRouter.route("/refund/:orderId").post(authentication, refundEscrowFunds);

module.exports = escrowRouter;
