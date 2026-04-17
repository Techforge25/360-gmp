const { isValidObjectId } = require("mongoose");
const Dispute = require("../models/disputeModel");
const Order = require("../models/orders");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../utils/validate");
const { createDisputeValidationSchema, changeDisputeStatusValidationSchema, 
adminDecisionValidationSchema } = require("../validations/disputeValidator");
const EscrowTransaction = require("../models/escrowTrasanction");
const Wallet = require("../models/walletModel");
const mongoose = require("mongoose");
const Stripe = require("stripe");
const Transaction = require("../models/transactionModel");

// Create dispute
const createDispute = asyncHandler(async (request, response) => {
    const { userProfileId } = request.user.profiles || {};
    const { orderId } = request.params;

    // Validate
    if(!userProfileId) throw new ApiError(400, "User profile ID is missing");
    if(!isValidObjectId(orderId)) throw new ApiError(400, "Invalid MongoDB ID! Please provide a valid Order ID");

    // Get validated payload
    const { reason, description, evidences } = validate(createDisputeValidationSchema, request.body) || {};

    // Find order in escrow
    const escrow = await EscrowTransaction.findOne({ orderId })
    .populate({ path:"orderId", select:"status" })
    .lean();

    // Checks
    if(!escrow) throw new ApiError(404, "Order not found in escrow history");
    if(String(userProfileId) !== String(escrow.buyerId)) throw new ApiError(403, "You can only dispute those orders that you have purchased");
    if(escrow.orderId?.status !== "delivered") throw new ApiError(403, "You can only submit a dispute when the order is in delivered state");

    // Prevent duplication
    const isExist = await Dispute.exists({ orderId });
    if(isExist) throw new ApiError(400, "You can create a dispute only once for each order");

    // Dispute creation charges
    const disputeAmount = 20;

    // Stripe instance
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        line_items: [
            {
                price_data: {
                    currency: "usd",
                    unit_amount: Number(disputeAmount) * 100,
                    product_data: {
                        name: "Dispute creation",
                        metadata: {
                            brand: "360-GMP",
                            category: "Dispute"
                        }
                    }
                },
                quantity: 1
            }
        ],
        metadata: {
            orderId: String(orderId),
            buyerId: String(escrow.buyerId),
            sellerId: String(escrow.sellerId),
            disputeAmount,
            reason,
            description,
            evidences: JSON.stringify(evidences)
        },
        success_url: `${process.env.BACKEND_URL}/api/v1/dispute/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.BACKEND_URL}/api/v1/dispute/cancel`
    });

    if(!session) throw new ApiError(400, "Stripe session creation failed");

    // Response
    return response.status(200).json(new ApiResponse(200, session.url, "Checkout url generated"));
});

// Dispute payment success
const disputePaymentSuccess = asyncHandler(async (request, response) => {
    const { session_id } = request.query;
    if (!session_id) throw new ApiError(400, "Session ID is missing");

    // Fetch session
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const stripeSession = await stripe.checkout.sessions.retrieve(session_id);

    // Validate
    if(!stripeSession) throw new ApiError(404, "Session not found");
    if(stripeSession.payment_status !== "paid") throw new ApiError(400, "Payment not completed");

    // Start MongoDB transaction
    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();
    try 
    {
        // Get payload from metadata
        const { orderId, buyerId, sellerId, disputeAmount, reason, description, evidences } = stripeSession.metadata;

        // Type safety
        const amount = Number(disputeAmount);

        // Create dispute    
        const dispute = await Dispute.create([{ 
            orderId, 
            buyerId, 
            sellerId, 
            reason, 
            description, 
            evidences: JSON.parse(evidences) 
        }], { session:dbSession });
        if(!dispute) throw new ApiError(500, "Failed to create dispute");

        // Update order status
        const order = await Order.findByIdAndUpdate(orderId, { $set:{ status:"dispute" } }, { session:dbSession });
        if(!order) throw new ApiError(500, "Failed to update order status");

        // Transaction record
        await Transaction.create([{
            ownerId: buyerId, 
            ownerModel: "UserProfile",
            orderId,
            amount,
            type: "dispute",
            stripeSessionId: stripeSession.id,
            status: "completed",
            paymentMethod:"stripe"
        }], { session:dbSession });       

        // Complete transaction
        await dbSession.commitTransaction();
        dbSession.endSession();

        // Response
        return response.status(303).redirect(`${process.env.FRONTEND_URL}`);
    } 
    catch(error) 
    {
        await dbSession.abortTransaction();
        dbSession.endSession();
        throw error;
    }
});

// View dispute details (admin only)
const viewDisputeDetails = asyncHandler(async (request, response) => {
    const { orderId } = request.params;
    if(!isValidObjectId(orderId)) throw new ApiError(400, "Invalid order ID");

    // Fetch dispute with related details
    const dispute = await Dispute.findOne({ orderId })
    .populate([
        { path: "orderId", select: "totalAmount status shippingAddress" },
        { path: "buyerId", select: "fullName email phone" },
        { path: "sellerId", select: "companyName businessType location b2bContact" }
    ]);
    if(!dispute) throw new ApiError(404, "Dispute not found");

    // Response
    return response.status(200).json(new ApiResponse(200, dispute, "Dispute details fetched successfully"));
});

// Change dispute status (admin only) - can be used to implement resolution actions later
const changeDisputeStatus = asyncHandler(async (request, response) => {
    const { orderId } = request.params;
    if(!isValidObjectId(orderId)) throw new ApiError(400, "Invalid Order ID");

    // Validate new status
    const { status } = validate(changeDisputeStatusValidationSchema, request.body);

    // Update dispute status
    const updatedDispute = await Dispute.findOneAndUpdate({ orderId }, { status }, { new: true });
    if(!updatedDispute) throw new ApiError(404, "Dispute not found");

    // Response
    return response.status(200).json(new ApiResponse(200, updatedDispute, "Dispute status updated successfully"));
}); 

// Admin decision
const adminDecision = asyncHandler(async (request, response) => {
    const { disputeId } = request.params;
    if(!isValidObjectId(disputeId)) throw new ApiError(400, "Invalid disputeId");

    // Validate admin decision details
    const { adminDecision, refundAmount = 0, adminNotes } = validate(adminDecisionValidationSchema, request.body);

    // Cases for refund decisions
    if(adminDecision === "reject") 
    {
        // Just update the dispute with admin decision and notes
        const updatedDispute = await Dispute.findByIdAndUpdate(disputeId, { adminDecision, adminNotes, status:"closed" }, { new: true });
        if(!updatedDispute) throw new ApiError(404, "Dispute not found");
        return response.status(200).json(new ApiResponse(200, updatedDispute, "Admin decision recorded successfully"));
    }

    // Get order ID
    const dispute = await Dispute.findById(disputeId).select("orderId").lean();
    if(!dispute) throw new ApiError(404, "Dispute not found");

    // Get total amount
    const escrow = await EscrowTransaction.findOne({ orderId:dispute.orderId })
    .select("totalAmount platformFee netAmount status paymentMethod");
    if(!escrow) throw new ApiError(404, "Escrow transaction not found");

    if(adminDecision === "full_refund" || (adminDecision === "partial_refund" && refundAmount > 0))
    {
        // Refund full amount to buyer's wallet
        const buyerWallet = await Wallet.findOne({ ownerId: dispute.buyerId, ownerModel: "UserProfile" });
        if(!buyerWallet) throw new ApiError(404, "Buyer wallet not found");

        // Start db transaction session
        const dbSession = await mongoose.startSession();
        dbSession.startTransaction();

        try
        {
            // Update wallet balances
            buyerWallet.availableBalance += Number(refundAmount);
            await buyerWallet.save({ session: dbSession });

            // Update escrow status to refunded
            escrow.totalAmount = adminDecision === "full_refund" ? 0 : (Number(escrow.totalAmount) - Number(refundAmount));
            escrow.platformFee = adminDecision === "full_refund" ? 0 : (Number(escrow.platformFee) - (Number(refundAmount) * 0.1)); // Assuming platform fee is 10%
            escrow.netAmount = adminDecision === "full_refund" ? 0 : (Number(escrow.netAmount) - (Number(refundAmount) * 0.9)); // Rest goes to seller
            escrow.status = "refunded";
            await escrow.save({ session: dbSession });

            // Update dispute with refund details
            const updatedDispute = await Dispute.findByIdAndUpdate(disputeId, 
                { adminDecision, refundAmount, adminNotes, status:"closed" }, 
                { new: true, session: dbSession }
            );
            if(!updatedDispute) throw new ApiError(404, "Dispute not found");

            // Commit transaction
            await dbSession.commitTransaction();
            dbSession.endSession();

            // Response
            return response.status(200).json(new ApiResponse(200, updatedDispute, "Admin decision recorded successfully"));
        }
        catch(error)
        {
            await dbSession.abortTransaction();
            dbSession.endSession();
            throw error;
        }
    }

    // Fallback response
    return response.status(200).json(new ApiResponse(200, null, "Admin decision recorded successfully"));
});

module.exports = { createDispute, disputePaymentSuccess, viewDisputeDetails, 
changeDisputeStatus, adminDecision };