const { isValidObjectId } = require("mongoose");
const Dispute = require("../models/disputeModel");
const Order = require("../models/orders");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../utils/validate");
const { createDisputeValidationSchema, changeDisputeStatusValidationSchema, 
adminDecisionValidationSchema, sellerResponseValidationSchema } = require("../validations/disputeValidator");
const EscrowTransaction = require("../models/escrowTrasanction");
const Wallet = require("../models/walletModel");
const mongoose = require("mongoose");
const Stripe = require("stripe");
const Transaction = require("../models/transactionModel");

// Create dispute with stripe
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
    if(escrow.status !== "held") throw new ApiError(403, `The amount for this order has already been ${escrow.status}`);
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
        const order = await Order.findByIdAndUpdate(orderId, { $set:{ status:"disputed" } }, { session:dbSession });
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

        // Get socket instance
        const io = request.app.get("io");
        io.to(String(buyerId)).emit("dispute-creation", { orderId });
        io.to(String(sellerId)).emit("dispute-creation", { orderId });

        // Response
        return response.status(303).redirect(`${process.env.FRONTEND_URL}/dashboard/user/orders/OrderTrackingPage/${orderId}`);
        // /dashboard/user/orders/OrderTrackingPage/69f09d71b6e4b66c096c7320
    } 
    catch(error) 
    {
        await dbSession.abortTransaction();
        dbSession.endSession();
        throw error;
    }
});

// Create with wallet
const createDisputeWithWallet = asyncHandler(async (request, response) => {
    const { userProfileId } = request.user.profiles || {};
    const { orderId } = request.params;

    // Validate
    if(!userProfileId) throw new ApiError(400, "User profile ID is missing");
    if(!isValidObjectId(orderId)) throw new ApiError(400, "Invalid MongoDB ID! Please provide a valid Order ID");

    // Find order in escrow
    const escrow = await EscrowTransaction.findOne({ orderId })
    .populate({ path:"orderId", select:"status" })
    .lean();

    // Checks
    if(!escrow) throw new ApiError(404, "Order not found in escrow history");
    if(String(userProfileId) !== String(escrow.buyerId)) throw new ApiError(403, "You can only dispute those orders that you have purchased");
    if(escrow.status !== "held") throw new ApiError(403, `The amount for this order has already been ${escrow.status}`);
    if(escrow.orderId?.status !== "delivered") throw new ApiError(403, "You can only submit a dispute when the order is in delivered state");

    // Prevent duplication
    const isExist = await Dispute.exists({ orderId });
    if(isExist) throw new ApiError(400, "You can create a dispute only once for each order");

    // Start MongoDB transaction
    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try
    { 
        // Get validated payload
        const { reason, description, evidences } = validate(createDisputeValidationSchema, request.body) || {};

        // Dispute creation charges
        const disputeAmount = 20;

        // Type safety
        const amount = Number(disputeAmount);        
        
        // Check wallet
        const buyerWallet = await Wallet.findOne({ ownerId: userProfileId, ownerModel: "UserProfile" })
        .select("availableBalance").session(dbSession);
        if(!buyerWallet)
        {
            throw new ApiError(404, "Wallet account not found! To initiate dispute with wallet, you need to create wallet account first");
        }

        // Check amount
        if(buyerWallet.availableBalance < amount) throw new ApiError(403, "You don't have sufficient balance to initiate a dispute");     
          

        // Deduct dispute fee from buyer's wallet
        await Wallet.findOneAndUpdate(
            { ownerId: userProfileId, ownerModel: "UserProfile", availableBalance: { $gte:amount } },
            { $inc:{ availableBalance: -amount } },
            { new:true, session: dbSession }
        );

        // Create dispute    
        const dispute = await Dispute.create([{ 
            orderId, 
            buyerId: userProfileId, 
            sellerId: escrow.sellerId, 
            reason, 
            description, 
            evidences
        }], { session:dbSession });
        if(!dispute) throw new ApiError(500, "Failed to create dispute");

        // Update order status
        const order = await Order.findByIdAndUpdate(orderId, { $set:{ status:"disputed" } }, { session:dbSession });
        if(!order) throw new ApiError(500, "Failed to update order status");

        // Transaction record
        await Transaction.create([{
            ownerId: userProfileId, 
            ownerModel: "UserProfile",
            orderId,
            amount,
            type: "dispute",
            status: "completed",
            paymentMethod:"wallet"
        }], { session:dbSession });    

        // Complete transaction
        await dbSession.commitTransaction();
        dbSession.endSession();

        // Get socket instance
        const io = request.app.get("io");
        io.to(String(userProfileId)).emit("dispute-creation", { orderId });
        io.to(String(escrow.sellerId)).emit("dispute-creation", { orderId });

        // Response
        return response.status(303).redirect(`${process.env.FRONTEND_URL}/dashboard/user/orders/OrderTrackingPage/${orderId}`);        
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
    ]).select("-__v -updatedAt");
    if(!dispute) throw new ApiError(404, "Dispute not found");

    // Response
    return response.status(200).json(new ApiResponse(200, dispute, "Dispute details fetched successfully"));
});

// Fetch products of disputed order
const fetchProductsOfDisputedOrder = asyncHandler(async (request, response) => {
    const { userProfileId } = request.user.profiles || {};
    const { orderId } = request.params;

    // Validate IDs
    if(!userProfileId) throw new ApiError(400, "User profile ID is missing");
    if(!isValidObjectId(orderId)) throw new ApiError(400, "Invalid order ID");

    // Order
    const order = await Order.findById({ _id:orderId, buyerUserProfileId:userProfileId })
    .populate({ path:"items.productId", select: "title image" }).select("items");
    if(!order) throw new ApiError(404, "No disputed order found");

    // Response
    return response.status(200).json(new ApiResponse(200, order, "Products of disputed orders have been fetched"));
});

// Change dispute status (admin only) - can be used to implement resolution actions later
const changeDisputeStatus = asyncHandler(async (request, response) => {
    const { orderId } = request.params;
    if(!isValidObjectId(orderId)) throw new ApiError(400, "Invalid Order ID");

    // Validate new status
    const { status } = validate(changeDisputeStatusValidationSchema, request.body);

    // Update dispute status
    const updatedDispute = await Dispute.findOneAndUpdate({ orderId }, { $set:{ status } }, { new: true });
    if(!updatedDispute) throw new ApiError(404, "Dispute not found");

    // Get socket instance
    const io = request.app.get("io");
    io.to(String(updatedDispute.buyerId)).emit("update-dispute", { orderId });
    io.to(String(updatedDispute.sellerId)).emit("update-dispute", { orderId });    

    // Response
    return response.status(200).json(new ApiResponse(200, updatedDispute, "Dispute status updated successfully"));
}); 

// Seller response
const sellerResponse = asyncHandler(async (request, response) => {
    const { businessProfileId } = request.user.profiles || {};
    const { orderId } = request.params;
    if(!isValidObjectId(orderId)) throw new ApiError(400, "Invalid Order ID");

    // Get validated payload
    const { description, evidences } = validate(sellerResponseValidationSchema, request.body);

    // Find order
    const order = await Order.findById(orderId).select("sellerBusinessId status").lean();
    if(!order) throw new ApiError(404, "Order not found");

    // Authorization check
    if(String(order.sellerBusinessId) !== String(businessProfileId))
    {
        throw new ApiError(403, "You can only respond to disputes for orders that belong to your business");
    }

    // Validate current status
    if(order.status !== "disputed") throw new ApiError(403, "You can only respond on orders that are currently in a disputed state");

    // Find disputed order
    const disputedOrder = await Dispute.findOne({ orderId, sellerId: businessProfileId });
    if(!disputedOrder) throw new ApiError(404, "Disputed order not found");

    // Cannot respond if the status is closed or resolved
    if(["resolved", "closed"].includes(disputedOrder.status)) throw new ApiError(403, "Dispute has already been resolved or closed by the admin.");

    // Only 1 response allowed per dispute
    if(disputedOrder.sellerResponseStatus)
    {
        throw new ApiError(403, "A response has already been recorded for this dispute. Further responses are not permitted.");
    }

    // Save to db
    disputedOrder.sellerResponse.description = description;
    disputedOrder.sellerResponse.evidences = evidences;
    disputedOrder.sellerResponseStatus = true;
    await disputedOrder.save();

    // Emit real time
    const io = request.app.get("io");
    io.to(String(disputedOrder.buyerId)).emit("update-dispute", { orderId });
    io.to(String(disputedOrder.sellerId)).emit("update-dispute", { orderId });      

    // Response
    return response.status(201).json(new ApiResponse(201, disputedOrder.sellerResponse, "Response has been submitted"));
});

// Admin decision
const adminDecision = asyncHandler(async (request, response) => {
    const { orderId } = request.params;
    if(!isValidObjectId(orderId)) throw new ApiError(400, "Invalid order ID");

    // Get socket instance
    const io = request.app.get("io");  
    
    // Get validated payload
    const { adminDecision, refundAmount = 0, adminNotes } = validate(adminDecisionValidationSchema, request.body);

    // Validate order
    const order = await Order.findById(orderId).select("_id").lean();
    if(!order) throw new ApiError(404, "Order not found");
    if(order.status !== "disputed") throw new ApiError(403, "You can only make a decision on orders that are currently in a disputed state");

    // Reject case
    if(adminDecision === "reject") 
    {
        // Start transaction
        const dbSession = await mongoose.startSession();
        dbSession.startTransaction();

        try
        {
            // Mark dispute as closed
            const updatedDispute = await Dispute.findOneAndUpdate(
                { orderId }, 
                { adminDecision, adminNotes, status: "closed" }, 
                { new: true, session: dbSession }
            ).select("adminDecision status");
            if(!updatedDispute) throw new ApiError(404, "Dispute not found");

            // Mark order as completed
            const updatedOrder = await Order.findByIdAndUpdate(
                orderId, 
                { $set:{ status: "completed" } },
                { new: true, session: dbSession }
            );
            if(!updatedOrder) throw new ApiError(500, "Failed to update order status");

            // Mark escrow status as released
            const escrow = await EscrowTransaction.findOneAndUpdate(
                { orderId },
                { $set:{ status:"released" } },
                { new: true, session: dbSession }
            );
            if(!escrow) throw new ApiError(404, "Escrow transaction not found");

            // Send net amount to seller's wallet
            await Wallet.findOneAndUpdate(
                { ownerId: escrow.sellerId, ownerModel:"BusinessProfile" },
                { 
                    $inc:{ 
                        pendingBalance: -Number(escrow.netAmount),
                        availableBalance: Number(escrow.netAmount)
                    } 
                },
            );

            // Emit socket
            io.to(String(updatedDispute.buyerId)).emit("update-dispute", { orderId });
            io.to(String(updatedDispute.sellerId)).emit("update-dispute", { orderId });          

            return response.status(200).json(new ApiResponse(200, updatedDispute, "Dispute rejected successfully"));
        }
        catch(error)
        {
            await dbSession.abortTransaction();
            dbSession.endSession();
            throw error;            
        }
    }

    // Get escrow details
    const escrow = await EscrowTransaction.findOne({ orderId });
    if(!escrow) throw new ApiError(404, "Escrow transaction not found");

    // Validate amounts
    if(adminDecision === "full_refund" && refundAmount !== Number(escrow.totalAmount)) 
    {
        throw new ApiError(400, "Refund amount mismatch. A full refund must equal the total escrow amount.");
    }

    if(adminDecision === "partial_refund" && (refundAmount <= 0 || refundAmount > escrow.totalAmount)) 
    {
        throw new ApiError(400, "Invalid refund amount. It must be greater than 0 and less than or equal to the escrow total.");
    }

    // Start transaction
    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try 
    {
        // Get wallets
        const buyerWallet = await Wallet.findOne({ ownerId: escrow.buyerId, ownerModel: "UserProfile"}).session(dbSession);
        const sellerWallet = await Wallet.findOne({ ownerId: escrow.sellerId, ownerModel: "BusinessProfile"}).session(dbSession);

        // Validate
        if(!buyerWallet) throw new ApiError(404, "Buyer wallet not found");
        if(!sellerWallet) throw new ApiError(404, "Seller wallet not found");
        if(sellerWallet.pendingBalance < refundAmount) throw new ApiError(400, "Seller does not have sufficient balance");

        // Update buyer wallet
        await Wallet.updateOne(
            { _id: buyerWallet._id },
            { $inc: { availableBalance: Number(refundAmount) + 20 } }, // Extra 20 fee for initiating dispute
            { session:dbSession }
        );

        // Update seller wallet
        await Wallet.updateOne(
            { _id: sellerWallet._id },
            { $inc: { pendingBalance: -Number(escrow.netAmount) } },
            { session:dbSession }
        );

        // Mark escrow status as refunded
        escrow.status = "refunded";
        await escrow.save({ session:dbSession });

        // Mark dispute as resolved
        const updatedDispute = await Dispute.findOneAndUpdate(
            { orderId },
            { adminDecision, refundAmount, adminNotes, status: "resolved" },
            { new: true, session:dbSession }
        );
        if(!updatedDispute) throw new ApiError(404, "Dispute not found");

        // Mark order as completed
        const updatedOrder = await Order.findByIdAndUpdate(
            orderId, 
            { $set:{ status: "completed" } },
            { new: true, session:dbSession }
        );
        if(!updatedOrder) throw new ApiError(500, "Failed to update order status");      

        // Commit transaction
        await dbSession.commitTransaction();
        dbSession.endSession();

        // Emit socket
        io.to(String(escrow.buyerId)).emit("update-dispute", { orderId });
        io.to(String(escrow.sellerId)).emit("update-dispute", { orderId });          

        // Response
        return response.status(200).json(new ApiResponse(200, updatedDispute, "Refund processed successfully"));
    } 
    catch(error) 
    {
        await dbSession.abortTransaction();
        dbSession.endSession();
        throw error;
    }
});

module.exports = { createDispute, disputePaymentSuccess, createDisputeWithWallet, 
viewDisputeDetails, changeDisputeStatus, sellerResponse, adminDecision, fetchProductsOfDisputedOrder };