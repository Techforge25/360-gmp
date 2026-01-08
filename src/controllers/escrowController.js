const BusinessProfile = require("../models/businessProfileSchema");
const EscrowTransaction = require("../models/escrowTrasanction");
const Order = require("../models/orders");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const Stripe = require("stripe");

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Step 1: Create Stripe Connect Account for Seller
// This allows sellers to receive payments through platform
const createConnectAccount = asyncHandler(async (request, response) => {
    const userId = request.user._id;
    
    // Get business profile
    const business = await BusinessProfile.findOne({ ownerUserId: userId });
    if(!business) {
        throw new ApiError(404, "Business profile not found");
    }

    // Check if account already exists
    if(business.stripeConnectAccountId) {
        // Generate account link for existing account
        const accountLink = await stripe.accountLinks.create({
            account: business.stripeConnectAccountId,
            refresh_url: `${process.env.FRONTEND_URL || process.env.BACKEND_URL}/seller/dashboard?refresh=true`,
            return_url: `${process.env.FRONTEND_URL || process.env.BACKEND_URL}/seller/dashboard?success=true`,
            type: "account_onboarding"
        });

        return response.status(200).json(new ApiResponse(200, {
            accountLink: accountLink.url,
            accountId: business.stripeConnectAccountId,
            status: business.stripeConnectOnboardingStatus
        }, "Connect account already exists. Use this link to complete onboarding"));
    }

    // Create new Stripe Connect account
    const account = await stripe.accounts.create({
        type: "express",
        country: business.location?.country || "US",
        email: business.b2bContact?.supportEmail || request.user.email,
        capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true }
        }
    });

    if(!account) {
        throw new ApiError(500, "Failed to create Stripe Connect account");
    }

    // Save account ID to business profile
    business.stripeConnectAccountId = account.id;
    business.stripeConnectOnboardingStatus = "in_progress";
    await business.save();

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: `${process.env.FRONTEND_URL || process.env.BACKEND_URL}/seller/dashboard?refresh=true`,
        return_url: `${process.env.FRONTEND_URL || process.env.BACKEND_URL}/seller/dashboard?success=true`,
        type: "account_onboarding"
    });

    return response.status(201).json(new ApiResponse(201, {
        accountLink: accountLink.url,
        accountId: account.id,
        status: "in_progress"
    }, "Stripe Connect account created. Complete onboarding to receive payments"));
});

// Step 2: Check Connect Account Status
const getConnectAccountStatus = asyncHandler(async (request, response) => {
    const userId = request.user._id;
    
    const business = await BusinessProfile.findOne({ ownerUserId: userId });
    if(!business) {
        throw new ApiError(404, "Business profile not found");
    }

    if(!business.stripeConnectAccountId) {
        return response.status(200).json(new ApiResponse(200, {
            hasAccount: false,
            status: "not_started"
        }, "No Connect account found"));
    }

    // Get account details from Stripe
    const account = await stripe.accounts.retrieve(business.stripeConnectAccountId);
    
    // Update local status based on Stripe status
    const isOnboardingComplete = account.details_submitted && account.charges_enabled;
    if(isOnboardingComplete && business.stripeConnectOnboardingStatus !== "completed") {
        business.stripeConnectOnboardingStatus = "completed";
        await business.save();
    }

    return response.status(200).json(new ApiResponse(200, {
        hasAccount: true,
        accountId: business.stripeConnectAccountId,
        status: business.stripeConnectOnboardingStatus,
        stripeStatus: {
            chargesEnabled: account.charges_enabled,
            payoutsEnabled: account.payouts_enabled,
            detailsSubmitted: account.details_submitted
        }
    }, "Connect account status retrieved"));
});

// Step 3: Release Escrow Funds to Seller
// Called when order is delivered/confirmed
const releaseEscrowFunds = asyncHandler(async (request, response) => {
    const { orderId } = request.params;
    const { releaseNotes } = request.body;

    // Get order with escrow transaction
    const order = await Order.findById(orderId)
        .populate("escrowTransactionId")
        .populate("sellerBusinessId");

    if(!order) {
        throw new ApiError(404, "Order not found");
    }

    if(!order.escrowTransactionId) {
        throw new ApiError(400, "No escrow transaction found for this order");
    }

    const escrow = order.escrowTransactionId;

    // Check if already released or refunded
    if(escrow.status === "released") {
        throw new ApiError(400, "Escrow funds already released");
    }
    if(escrow.status === "refunded") {
        throw new ApiError(400, "Escrow funds already refunded");
    }

    // Get seller's Stripe Connect account
    const sellerBusiness = order.sellerBusinessId;
    if(!sellerBusiness || !sellerBusiness.stripeConnectAccountId) {
        throw new ApiError(400, "Seller has not set up Stripe Connect account");
    }

    // Check if seller's account is ready
    const sellerAccount = await stripe.accounts.retrieve(sellerBusiness.stripeConnectAccountId);
    if(!sellerAccount.charges_enabled) {
        throw new ApiError(400, "Seller's Stripe account is not ready to receive payments");
    }

    // Create transfer to seller's Stripe Connect account
    // Platform fee can be deducted here (e.g., 5% platform fee)
    const platformFeePercent = parseFloat(process.env.PLATFORM_FEE_PERCENT || "5");
    const platformFee = Math.round(escrow.amount * (platformFeePercent / 100) * 100); // In cents
    const transferAmount = Math.round(escrow.amount * 100) - platformFee; // Amount to seller in cents

    const transfer = await stripe.transfers.create({
        amount: transferAmount,
        currency: escrow.currency || "usd",
        destination: sellerBusiness.stripeConnectAccountId,
        metadata: {
            orderId: orderId.toString(),
            escrowTransactionId: escrow._id.toString()
        }
    });

    if(!transfer) {
        throw new ApiError(500, "Failed to transfer funds to seller");
    }

    // Update escrow transaction
    escrow.status = "released";
    escrow.transferId = transfer.id;
    escrow.releasedAt = new Date();
    escrow.releaseNotes = releaseNotes || "Released after order delivery confirmation";
    await escrow.save();

    // Update order
    order.escrowStatus = "released";
    order.orderStatus = "Delivered";
    await order.save();

    return response.status(200).json(new ApiResponse(200, {
        escrowTransaction: escrow,
        transfer: {
            id: transfer.id,
            amount: transfer.amount / 100,
            platformFee: platformFee / 100,
            transferAmount: transferAmount / 100
        }
    }, "Escrow funds released to seller successfully"));
});

// Step 4: Refund Escrow Funds to Buyer
// Called when order is cancelled or dispute
const refundEscrowFunds = asyncHandler(async (request, response) => {
    const { orderId } = request.params;
    const { refundReason } = request.body;

    // Get order with escrow transaction
    const order = await Order.findById(orderId)
        .populate("escrowTransactionId");

    if(!order) {
        throw new ApiError(404, "Order not found");
    }

    if(!order.escrowTransactionId) {
        throw new ApiError(400, "No escrow transaction found for this order");
    }

    const escrow = order.escrowTransactionId;

    // Check if already released or refunded
    if(escrow.status === "released") {
        throw new ApiError(400, "Escrow funds already released to seller");
    }
    if(escrow.status === "refunded") {
        throw new ApiError(400, "Escrow funds already refunded");
    }

    // Refund payment intent
    const refund = await stripe.refunds.create({
        payment_intent: escrow.paymentIntentId,
        amount: Math.round(escrow.amount * 100), // Amount in cents
        reason: "requested_by_customer",
        metadata: {
            orderId: orderId.toString(),
            escrowTransactionId: escrow._id.toString()
        }
    });

    if(!refund) {
        throw new ApiError(500, "Failed to process refund");
    }

    // Update escrow transaction
    escrow.status = "refunded";
    escrow.refundId = refund.id;
    escrow.refundedAt = new Date();
    escrow.refundReason = refundReason || "Order cancelled";
    await escrow.save();

    // Update order
    order.escrowStatus = "refunded";
    order.paymentStatus = "Refunded";
    order.orderStatus = "Cancelled";
    
    // Restore product stock
    for(const item of order.items) {
        await require("../models/products").Product.findByIdAndUpdate(
            item.productId,
            { $inc: { stockQty: item.quantity } }
        );
    }
    
    await order.save();

    return response.status(200).json(new ApiResponse(200, {
        escrowTransaction: escrow,
        refund: {
            id: refund.id,
            amount: refund.amount / 100,
            status: refund.status
        }
    }, "Escrow funds refunded to buyer successfully"));
});

// Step 5: Get Escrow Transaction Details
const getEscrowTransaction = asyncHandler(async (request, response) => {
    const { transactionId } = request.params;

    const escrow = await EscrowTransaction.findById(transactionId)
        .populate("orderId")
        .populate("sellerBusinessId", "companyName")
        .populate("buyerUserId", "email");

    if(!escrow) {
        throw new ApiError(404, "Escrow transaction not found");
    }

    return response.status(200).json(new ApiResponse(200, escrow, "Escrow transaction details retrieved"));
});

module.exports = {
    createConnectAccount,
    getConnectAccountStatus,
    releaseEscrowFunds,
    refundEscrowFunds,
    getEscrowTransaction
};
