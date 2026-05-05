const Order = require("../models/orders");
const Product = require("../models/products");
const UserProfile = require("../models/userProfile");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const Stripe = require("stripe");
const mongoose = require("mongoose");
const { isValidObjectId } = require("mongoose");
const EscrowTransaction = require("../models/escrowTrasanction");
const Wallet = require("../models/walletModel");
const BusinessProfile = require("../models/businessProfileSchema");
const { emptyList, frontendUrl } = require("../constants");
const convertToMongoId = require("../utils/convertToMongoId");
const Transaction = require("../models/transactionModel");
const TrialUsage = require("../models/trialUsageModel");
const validate = require("../utils/validate");
const { createOrderValidationSchema, updateOrderStatusValidationSchema, 
updateTrackingInfoValidationSchema, cancelOrderValidationSchema } = require("../validations/orderValidator");
const sendNotification = require("../utils/sendNotification");
const Dispute = require("../models/disputeModel");

// Create order - Purchase product using stripe payment
const createOrder = asyncHandler(async (request, response) => {
    const userId = request.user._id;
    const { planName } = request.user || {};
    if(!planName) throw new ApiError(400, "No subscription plan name found");

    // Track trial orders
    if(planName === "TRIAL")
    {
        const trial = await TrialUsage.findOne({ userId, ordersUsed:{ $gte:1 } });
        if(trial && trial.ordersUsed >= 1) throw new ApiError(403, "Trial users can place only one order. Please upgrade your plan.");
    }

    // Get user profile
    const userProfile = await UserProfile.findOne({ userId }).select("_id").lean();
    if(!userProfile) throw new ApiError(404, "User profile not found! Invalid user profile ID");

    // Validate request body
    const { shippingAddress, items } = validate(createOrderValidationSchema, request.body);
    if(!shippingAddress) throw new ApiError(400, "Shipping address is required");
    if(!items || !items.length) throw new ApiError(400, "Product item is required");

    // Variables
    let sellerBusinessId = null;
    let sellerParentUserId = null; // For sending notification to user
    let serverComputedTotal = 0;

    // Loop through items for validation & calculation
    for(const item of items)
    {
        const { productId, quantity } = item;

        // Validate quantity
        if(!quantity || quantity <= 0) throw new ApiError(400, "Invalid product quantity");

        // Trial user cannot purchase in bulk
        if(planName === "TRIAL" && quantity > 1) throw new ApiError(400, "You cannot purchase in bulk within Trial period! Please upgrade");

        // Fetch product from DB (price & shipping must come from server)
        const product = await Product.findById(productId)
        .select("title stockQty minOrderQty pricePerUnit shippingCost businessId isSingleProductAvailable");
        if(!product) throw new ApiError(404, "Product not found");

        // User cannot purchase his own product from his own business profile
        const businessProfile = await BusinessProfile.findById(product.businessId).select("ownerUserId").lean();
        if(!businessProfile) throw new ApiError(404, "Product owner not found");
        if(String(businessProfile.ownerUserId) === String(userId))
        {
            throw new ApiError(400, "You cannot purchase product from your own business profile");
        }

        // Restrict single-item purchase if the product is available only for bulk orders
        if(!product.isSingleProductAvailable && quantity <= 1)
        {
            throw new ApiError(400, `${product.title} is available for bulk purchase only. Single-item orders are not allowed.`);
        }

        // Enforce single seller per order
        if(!sellerBusinessId)
        {
            sellerBusinessId = String(product.businessId);
            sellerParentUserId = String(businessProfile.ownerUserId);
        }
        else if(sellerBusinessId !== product.businessId.toString())
        {
            throw new ApiError(400, "Multiple sellers in one order are not allowed");
        }

        // Compare stock quantity with demanded quantity
        if(product.stockQty < Number(quantity)) throw new ApiError(400, `Only ${product.stockQty} unit(s) available for "${product.title}"`);

        // Validate min order quantity
        if(product.minOrderQty > Number(quantity))
        {
            const message = `Minimum order quantity for "${product.title}" is ${product.minOrderQty}. Please increase the quantity for "${product.title}"`
            throw new ApiError(400, message);
        }

        // Compute item total (SERVER TRUSTED)
        const itemTotal = Number(product.pricePerUnit) * Number(quantity) + Number(product.shippingCost);
        serverComputedTotal += itemTotal;
    }

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
                    unit_amount: Number(serverComputedTotal) * 100,
                    product_data: {
                        name: "Product purchasing",
                        metadata: {
                            brand: "360-GMP",
                            category: "Products"
                        }
                    }
                },
                quantity: 1
            }
        ],
        metadata: {
            userId: String(userId), // Sending parent user ID for marking trial usage after order completion
            buyerUserProfileId: String(userProfile._id),
            sellerBusinessId: String(sellerBusinessId),
            sellerParentUserId: String(sellerParentUserId),
            totalAmount: serverComputedTotal,
            shippingAddress: JSON.stringify(shippingAddress),
            items: JSON.stringify(items),
            planName
        },
        success_url: `${process.env.BACKEND_URL}/api/v1/orders/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.BACKEND_URL}/api/v1/orders/stripe/cancel`
    });

    if(!session) throw new ApiError(400, "Stripe session creation failed");

    // Response
    return response.status(200).json(new ApiResponse(200, session.url, "Checkout url generated"));
});

// Verify stripe payment for orders
const verifyStripePaymentForOrders = asyncHandler(async (request, response) => {
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
        // Extract data from metadata
        const { userId, buyerUserProfileId, sellerBusinessId, sellerParentUserId, 
        totalAmount, shippingAddress, items, planName } = stripeSession.metadata;
        const parsedItems = JSON.parse(items);

        // Stock deduction and prepare items with priceAtPurchase
        const itemsWithPrice = [];
        for (const item of parsedItems) 
        {
            const { productId, quantity } = item;

            const product = await Product.findOneAndUpdate(
                { _id: productId, stockQty: { $gte: Number(quantity) } },
                { $inc: { stockQty: -Number(quantity) } },
                { new: true, session: dbSession }
            );

            if(!product) 
            {
                const existingProduct = await Product.findById(productId).select("title stockQty").session(dbSession);
                if(!existingProduct) throw new ApiError(404, "Product not found");

                throw new ApiError(400,`Only ${existingProduct.stockQty} unit(s) available for "${existingProduct.title}"`);
            }

            // Add priceAtPurchase to item
            itemsWithPrice.push({
                productId: product._id,
                quantity: Number(quantity),
                priceAtPurchase: product.pricePerUnit
            });
        }

        // Type safety
        const amount = Number(totalAmount);

        // Create order
        const [order] = await Order.create([{
            buyerUserProfileId,
            sellerBusinessId,
            totalAmount:amount,
            status: "pending",
            shippingAddress: JSON.parse(shippingAddress),
            items: itemsWithPrice
        }], { session:dbSession });

        // Escrow calculation
        const platformFee = amount * 0.10; // 10% Fee
        const netAmount = amount - platformFee; // Seller's share

        // Hold on escrow
        await EscrowTransaction.create([{
            orderId: order._id,
            sellerId: sellerBusinessId,
            buyerId: buyerUserProfileId,
            totalAmount: amount,
            platformFee: Number(platformFee),
            netAmount: Number(netAmount),
            status: 'held', // Amount held
            paymentMethod:"stripe"
        }], { session:dbSession });

        // Update wallet
        await Wallet.findOneAndUpdate(
            { ownerId:sellerBusinessId, ownerModel:"BusinessProfile" },
            { $inc: { pendingBalance:netAmount } },
            { upsert:true, session:dbSession }
        );

        // Transaction for user profile
        await Transaction.create([{
            ownerId: buyerUserProfileId, 
            ownerModel: "UserProfile",
            orderId: order._id,
            amount: amount,
            type: "buy",
            stripeSessionId: stripeSession.id,
            status: "completed",
            paymentMethod:"stripe"
        }], { session:dbSession });

        // Transaction for business profile
        await Transaction.create([{
            ownerId: sellerBusinessId, 
            ownerModel: "BusinessProfile",
            orderId: order._id,
            amount: amount,
            type: "sale",
            stripeSessionId: stripeSession.id,
            status: "completed",
            paymentMethod:"stripe"
        }], { session:dbSession });        

        // Mark trial usage after successful payment
        if(planName === "TRIAL")
        {
            await TrialUsage.findOneAndUpdate(
                { userId },
                { $set:{ ordersUsed:1 } },
                { upsert:true, session:dbSession }
            ); 
        }

        // Complete transaction
        await dbSession.commitTransaction();
        dbSession.endSession();

        // Get socket instance
        const io = request.app.get("io");
        
        // Emit real-time event to business profile for order creation
        io.to(String(sellerBusinessId)).emit("order-creation", order);

        // Send notification to buyer (user profile)
        await sendNotification({ 
            userId,
            title: "Order Placement Through Stripe", 
            content: `Your have placed a new order successfully! Your stripe session ID is ${stripeSession.id}`,
            type: "UserProfile",
            io
        });        

        // Send notification to seller (business profile)
        await sendNotification({ 
            userId: sellerParentUserId,
            title: "Order Placement", 
            content: `You have received a new order.`,
            type: "BusinessProfile",
            io
        });

        // Response
        return response.status(303).redirect(`${frontendUrl}/dashboard/user/checkout/payment-confirmation/${order._id}`);
    } 
    catch(error) 
    {
        await dbSession.abortTransaction();
        dbSession.endSession();
        throw error;
    }
});

// Purchase product using Wallet balance
const createOrderWithWallet = asyncHandler(async (request, response) => {
    const userId = request.user._id;
    const { planName } = request.user || {};
    if(!planName) throw new ApiError(400, "No subscription plan name found");

    // Track trial orders
    if(planName === "TRIAL")
    {
        const trial = await TrialUsage.findOne({ userId, ordersUsed:{ $gte:1 } });
        if(trial && trial.ordersUsed >= 1) throw new ApiError(403, "Trial users can place only one order. Please upgrade your plan.");
    }    

    // Get buyer profile
    const userProfile = await UserProfile.findOne({ userId }).select("_id").lean();
    if(!userProfile) throw new ApiError(404, "User profile not found");

    // Get payload
    const { shippingAddress, items } = request.body;

    // Validate shipping address and items
    if(!shippingAddress) throw new ApiError(400, "Shipping address is required");
    if(!items || !items.length) throw new ApiError(400, "Product item is required");

    let sellerBusinessId = null;
    let sellerParentUserId = null; // For sending notification to user
    let serverComputedTotal = 0;

    // Validate items & compute total
    for(const item of items)
    {
        const { productId, quantity } = item;

        // Validate quantity
        if(!quantity || quantity <= 0) throw new ApiError(400, "Invalid product quantity");

        // Trial cannot purchase in bulk
        if(planName === "TRIAL" && quantity > 1) throw new ApiError(400, "You cannot purchase in bulk within Trial period! Please upgrade");

        // Find each product by "id"
        const product = await Product.findById(productId)
        .select("title stockQty minOrderQty pricePerUnit shippingCost businessId");
        if(!product) throw new ApiError(404, "Product not found");

        // User cannot purchase his own product from his own business profile
        const businessProfile = await BusinessProfile.findById(product.businessId).select("ownerUserId").lean();
        if(!businessProfile) throw new ApiError(404, "Product owner not found");
        if(String(businessProfile.ownerUserId) === String(userId))
        {
            throw new ApiError(400, "You cannot purchase product from your own business profile");
        }        

        // Restrict single-item purchase if the product is available only for bulk orders
        if(!product.isSingleProductAvailable && quantity <= 1)
        {
            throw new ApiError(400, `${product.title} is available for bulk purchase only. Single-item orders are not allowed.`);
        }

        // Prevent multiple sellers in single order
        if(!sellerBusinessId)
        {
            sellerBusinessId = String(product.businessId);
            sellerParentUserId = String(businessProfile.ownerUserId);
        }
        else if(sellerBusinessId !== product.businessId.toString())
        {
            throw new ApiError(400, "Multiple sellers in one order are not allowed");
        }

        // Compare stock quantity with demanded quantity
        if(product.stockQty < Number(quantity)) throw new ApiError(400, `Only ${product.stockQty} unit(s) available for "${product.title}"`);

        // Validate min order quantity
        if(product.minOrderQty > Number(quantity))
        {
            const message = `Minimum order quantity for "${product.title}" is ${product.minOrderQty}. Please increase the quantity for "${product.title}"`
            throw new ApiError(400, message);
        }

        // Compute total amount
        const itemTotal = (product.pricePerUnit * quantity) + product.shippingCost || 0;
        serverComputedTotal += itemTotal;
    }

    // Start DB transaction
    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try 
    {
        const amount = Number(serverComputedTotal);

        // Deduct balance from buyer wallet 
        const buyerWallet = await Wallet.findOneAndUpdate(
            { ownerId: userProfile._id, ownerModel: "UserProfile", availableBalance: { $gte: amount } },
            { $inc: { availableBalance: -amount } },
            { new: true, session: dbSession }
        );
        if(!buyerWallet) throw new ApiError(400, "Insufficient wallet balance");

        // Deduct stock & prepare items
        const itemsWithPrice = [];
        for(const item of items) 
        {
            const { productId, quantity } = item;

            // Deduct stock
            const product = await Product.findOneAndUpdate(
                { _id: productId, stockQty: { $gte: quantity } },
                { $inc: { stockQty: -quantity } },
                { new: true, session: dbSession }
            );
            if(!product) throw new ApiError(400, "Product went out of stock");

            // Push items
            itemsWithPrice.push({
                productId: product._id,
                quantity,
                priceAtPurchase: product.pricePerUnit
            });
        }

        // Create order
        const [order] = await Order.create([{
            buyerUserProfileId: userProfile._id,
            sellerBusinessId,
            totalAmount: amount,
            status: "pending",
            shippingAddress,
            items: itemsWithPrice
        }], { session: dbSession });

        // Escrow calculation
        const platformFee = amount * 0.10;
        const netAmount = amount - platformFee; // Seller's share

        // Hold escrow
        await EscrowTransaction.create([{
            orderId: order._id,
            sellerId: sellerBusinessId,
            buyerId: userProfile._id,
            totalAmount: amount,
            platformFee,
            netAmount,
            status: "held",
            paymentMethod: "wallet"
        }], { session: dbSession });
        

        // Increase seller pending balance
        await Wallet.findOneAndUpdate(
            { ownerId: sellerBusinessId, ownerModel: "BusinessProfile" },
            { $inc: { pendingBalance: netAmount } },
            { upsert: true, session: dbSession }
        );

        // Log buyer wallet transaction
        await Transaction.create([{
            ownerId: userProfile._id,
            ownerModel: "UserProfile",
            orderId: order._id,
            amount,
            type: "buy",
            paymentMethod: "wallet",
            status: "completed"
        }], { session: dbSession });

        // Log seller wallet transaction
        await Transaction.create([{
            ownerId: sellerBusinessId,
            ownerModel: "BusinessProfile",
            orderId: order._id,
            amount,
            type: "sale",
            paymentMethod: "wallet",
            status: "completed"
        }], { session: dbSession });      

        // Mark trial usage after successful payment
        if(planName === "TRIAL")
        {
            await TrialUsage.findOneAndUpdate(
                { userId },
                { $set:{ ordersUsed:1 } },
                { upsert:true, session:dbSession }
            ); 
        }        

        // Commit db changes
        await dbSession.commitTransaction();
        dbSession.endSession();

        // Get socket instance
        const io = request.app.get("io");

        // Emit real-time event to business profile for order creation
        io.to(String(sellerBusinessId)).emit("order-creation", order); 

        // Send notification to seller (user profile)
        await sendNotification({ 
            userId,
            title: "Order Placement Through Wallet", 
            content: `You have placed a new order successfully!`,
            type: "UserProfile",
            io
        });         

        // Send notification to seller (business profile)
        await sendNotification({ 
            userId: sellerParentUserId,
            title: "Order Placement", 
            content: `You have received a new order.`,
            type: "BusinessProfile",
            io
        });        

        // Response
        return response.status(201).json(new ApiResponse(201, order, "Order placed successfully using wallet"));
    } 
    catch(error) 
    {
        await dbSession.abortTransaction();
        dbSession.endSession();
        throw error;
    }
});

// Fetch all user orders
const fetchAllUserOrders = asyncHandler(async (request, response) => {
    const { userProfileId } = request.user.profiles || {};

    // Pagination options
    const { page = 1, limit = 10 } = request.query;

    // Find orders
    const orders = await Order.paginate({ buyerUserProfileId:userProfileId }, 
        { page, limit, lean:true, select:"sellerBusinessId items createdAt totalAmount status", sort:{ createdAt:-1 },
        populate: { path:"sellerBusinessId", select:"companyName" }
    });
    if(!orders.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "No orders found"));

    // Add orderType flag
    orders.docs = orders.docs.map(({ items, id, ...order }) => ({
        ...order,
        orderType: items?.length > 1 ? "bulk" : "single"
    }));

    // Response
    return response.status(200).json(new ApiResponse(200, orders, "User orders fetch successfully"));
});

// Update order tracking info
const updateOrderTrackingInfo = asyncHandler(async (request, response) => {
    const userId = request.user._id;
    const { businessProfileId } = request.user.profiles || {};
    const { orderId } = request.params;

    // Validate IDs
    if(!businessProfileId) throw new ApiError(400, "Business profile ID is missing");
    if(!isValidObjectId(businessProfileId)) throw new ApiError(400, "Invalid Business profile ID");
    if(!isValidObjectId(orderId)) throw new ApiError(400, "Invalid Order ID");

    // Get validated payload
    const { courierName, trackingId } = validate(updateTrackingInfoValidationSchema, request.body) || {};

    // Find order
    const order = await Order.findById(orderId)
    .populate({ path: "buyerUserProfileId", select: "_id userId" })
    .select("sellerBusinessId buyerUserProfileId tracking status");
    if(!order) throw new ApiError(404, "Order not found");

    // Authorize owner
    if(String(order.sellerBusinessId) !== String(businessProfileId)) throw new ApiError(403, "You are not authorized to update the tracking info");

    // Save to db
    order.tracking.courierName = courierName;
    order.tracking.trackingId = trackingId;
    await order.save();

    // Emit event real-time
    const io = request.app.get("io");
    io.to(String(order.buyerUserProfileId._id)).emit("update-order-status", { orderId:order._id, status: order.status });

    // Send notification to user
    await sendNotification({ 
        userId: order.buyerUserProfileId.userId,
        title: "Order Update", 
        content: `Courier info has been attached to your order`, 
        type: "UserProfile",
        io: request.app.get("io") 
    }); 

    // Response
    return response.status(200).json(new ApiResponse(200, order.tracking, "Order tracking info has been updated"));
});

// Update order status by seller (Business)
const updateOrderStatusBySeller = asyncHandler(async (request, response) => {
    const userId = request.user._id;
    const { businessProfileId } = request.user.profiles || {};    
    const { orderId } = request.params;

    // Validate IDs
    if(!businessProfileId) throw new ApiError(400, "Business profile ID is missing");
    if(!isValidObjectId(businessProfileId)) throw new ApiError(400, "Invalid Business profile ID");
    if(!isValidObjectId(orderId)) throw new ApiError(400, "Invalid Order ID");
    
    // Get validated payload
    const { status, tracking } = validate(updateOrderStatusValidationSchema, request.body);

    // Find order
    const order = await Order.findById(orderId)
    .populate({ path:"buyerUserProfileId", select:"userId" });
    if(!order) throw new ApiError(404, "Order not found");

    // Authorize owner
    if(String(order.sellerBusinessId) !== String(businessProfileId)) throw new ApiError(403, "You are not authorized to update the order status");

    // Prevent duplicate status update
    if(status === order.status) return response.status(200).json(new ApiResponse(200, null, `The order status is already ${status}`));

    // Cannot update status after it is cancelled
    if(order.status === "cancelled") throw new ApiError(400, "This order has been cancelled by customer");

    // Handle delivered and shipped statuses
    if(status === "delivered") order.tracking.deliveredAt = new Date();
    if(status === "shipped")
    {
        order.tracking = tracking;
        order.tracking.shippedAt = new Date();
    }

    // Save status
    order.status = status;
    await order.save();

    // Emit event real-time
    const io = request.app.get("io");
    io.to(String(order.buyerUserProfileId._id)).timeout(5000).emit("update-order-status", { orderId:order._id, status }, (error, response) => {
        if(error)
        {
            console.log("Event not recieved!", error);
        }
        else
        {
            console.log("Delivered", response);
        }
    });

    // Send notification to user profile
    await sendNotification({
        userId: order.buyerUserProfileId.userId,
        title: "Order Update",
        content: `Your order has ${status}`,
        type: "UserProfile",
        io
    });

    // Response
    return response.status(200).json(new ApiResponse(200, order, `Status updated to ${status}`));
});

// Complete order (Escrow will release funds to seller's wallet)
const completeOrder = asyncHandler(async (request, response) => {
    const userId = request.user._id;
    const { userProfileId } = request.user.profiles || {};
    const { orderId } = request.params;

    // Validate IDs
    if(!userProfileId) throw new ApiError(400, "User profile ID is missing");
    if(!isValidObjectId(userProfileId)) throw new ApiError(400, "Invalid User profile ID");
    if(!isValidObjectId(orderId)) throw new ApiError(400, "Invalid Order ID");    

    // Find order
    const order = await Order.findById(orderId)
    .populate({ path:"sellerBusinessId", select:"ownerUserId" });
    if(!order) throw new ApiError(404, "Order not found");

    // Authorize owner
    if(String(userProfileId) !== String(order.buyerUserProfileId)) throw new ApiError(403, "You are not authorized to complete this order");
    
    // Check current status
    const allowedCurrentStatuses = ["paid", "delivered"];
    if(order.status === "completed") return response.status(200).json(new ApiResponse(200, null, "Order has already been completed"));
    if(!allowedCurrentStatuses.includes(order.status)) throw new ApiError(400, `Order cannot be completed in its current status: ${order.status}`);

    // Find escrow
    const escrow = await EscrowTransaction.findOne({ orderId:order._id, status:"held" });
    if(!escrow) throw new ApiError(404, "Escrow record not found or already released");

    // Start db session for safe transaction
    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try 
    {
        // Update order status
        order.status = "completed";
        order.completedAt = new Date();
        await order.save({ session:dbSession });

        // Update escrow status
        escrow.status = "released";
        await escrow.save({ session:dbSession });

        // Release funds (Update business profile wallet)
        await Wallet.findOneAndUpdate(
            { ownerId:order.sellerBusinessId._id, ownerModel:"BusinessProfile" },
            { $inc:{ pendingBalance:-escrow.netAmount, availableBalance:escrow.netAmount, totalEarned:escrow.netAmount } },
            { upsert:true, session:dbSession }
        );

        // Commit changes
        await dbSession.commitTransaction();
        dbSession.endSession();

        // Emit event real-time
        const io = request.app.get("io");
        io.to(String(order.sellerBusinessId._id)).emit("update-order-status", { orderId:order._id, status:order.status });
        
        // Send notification to business profile for order completion
        await sendNotification({
            userId: order.sellerBusinessId.ownerUserId,
            title: "Order Completion!",
            content: "Order has been completed!",
            type: "BusinessProfile",
            io
        });

        // Response
        return response.status(200).json(new ApiResponse(200, { orderId:order._id, status:order.status }, "Order completed successfully"));
    } 
    catch(error) 
    {
        await dbSession.abortTransaction();
        dbSession.endSession();
        throw error;
    }
});

// Cancel order
const cancelOrder = asyncHandler(async (request, response) => {
    const { orderId } = request.params;
    const userId = request.user._id;

    // Find buyer profile
    const buyerProfile = await UserProfile.findOne({ userId });
    if(!buyerProfile) throw new ApiError(404, "User profile not found");

    // Find order
    const order = await Order.findById(orderId)
    .populate({ path:"sellerBusinessId", path:"ownerUserId" });
    if(!order) throw new ApiError(404, "Order not found");

    // Authorize owner
    if(String(buyerProfile._id) !== String(order.buyerUserProfileId)) throw new ApiError(403, "You are not authorized to cancel this order");

    // Validate current status
    const allowedCurrentStatuses = ["pending", "processing"];
    if(order.status === "cancelled") return response.status(200).json(new ApiResponse(200, null, "Order has already been cancelled"));
    if(!allowedCurrentStatuses.includes(order.status)) throw new ApiError(400, `Order cannot be cancelled in its current status: ${order.status}`);

    // Check if account is frozen
    if(buyerProfile.accountFrozenUntil && buyerProfile.accountFrozenUntil > new Date())
    {
        throw new ApiError(403, "Your account is temporarily frozen due to repeated cancellations. Please try again later.");
    }    

    // Get validated payload
    const { cancellation } = validate(cancelOrderValidationSchema, request.body);

    // Start db transaction
    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try
    {
        // Restore stock quantities
        for(const item of order.items)
        {
            // Get each product ID & quantity
            const { productId, quantity } = item;

            // Update
            await Product.findByIdAndUpdate(
                productId,
                { $inc:{ stockQty: Number(quantity) } },
                { session:dbSession }
            );
        }

        // Set order status
        order.cancellation = cancellation;
        order.status = "cancelled";
        await order.save({ session:dbSession });

        // Update escrow status
        const escrow = await EscrowTransaction.findOneAndUpdate(
            { orderId },
            { $set:{ status:"refunded" } },
            { new:true, session:dbSession }
        );

        if(!escrow) throw new ApiError(404, "Escrow record not found");

        // Wallet adjustments
        await Wallet.findOneAndUpdate(
            { ownerId: order.sellerBusinessId, ownerModel:"BusinessProfile" },
            { $inc:{ pendingBalance: -escrow.netAmount } },
            { upsert:true, session:dbSession }
        );

        await Wallet.findOneAndUpdate(
            { ownerId: order.buyerUserProfileId, ownerModel:"UserProfile" },
            { $inc:{ availableBalance: escrow.totalAmount } },
            { upsert:true, session:dbSession }
        );

        // Handle consecutive cancellations
        const now = new Date();
        let cancellationCount = buyerProfile.cancellationCount || 0;
        let lastCancellationAt = buyerProfile.lastCancellationAt;

        // If last cancellation was within 24 hours then count as consecutive
        if(lastCancellationAt)
        {
            const diffInHours = (now - new Date(lastCancellationAt)) / (1000 * 60 * 60);

            if(diffInHours <= 24)
            {
                cancellationCount += 1;
            }
            else
            {
                cancellationCount = 1; // Reset if gap is more than 24h
            }
        }
        else
        {
            cancellationCount = 1;
        }

        let freezeUntil = null;
        if(cancellationCount >= 3)
        {
            freezeUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            cancellationCount = 0; // Reset counter after freeze

            // Send notification to user
            await sendNotification({ 
                userId,
                title: "Account Freeze", 
                content: `Your account is temporarily frozen due to repeated cancellations. Please try again after 24 hours.`, 
                type: "UserProfile",
                io: request.app.get("io") 
            });  
        }

        // Update user profile restriction data
        const userProfile = await UserProfile.findByIdAndUpdate(
            buyerProfile._id,
            {
                $set:{
                    cancellationCount,
                    lastCancellationAt: now,
                    accountFrozenUntil: freezeUntil
                }
            },
            { session:dbSession }
        );

        // Commit transaction
        await dbSession.commitTransaction();
        dbSession.endSession();

        // Emit real-time update
        const io = request.app.get("io");
        io.to(String(order.sellerBusinessId)).emit("update-order-status", {
            orderId: order._id,
            status: order.status
        });

        // Send notification
        await sendNotification({
            userId: order.sellerBusinessId.ownerUserId,
            title: `Order cancellation`,
            content: `${userProfile.fullName} has cancelled the order.`,
            type: "BusinessProfile",
            io
        });

        // Response
        return response.status(200).json(new ApiResponse(200, { orderId:order._id, status:order.status }, "Order cancelled successfully"));
    }
    catch(error)
    {
        await dbSession.abortTransaction();
        dbSession.endSession();
        throw error;
    }
});

// ===================== USER SIDE STARTED ===================== //

// Fetch new orders for users
const fetchNewOrders = asyncHandler(async (request, response) => {
    const { userProfileId } = request.user.profiles || {};

    // Pagination options
    const { page = 1, limit = 10 } = request.query;

    // Find orders
    const orders = await Order.paginate({ buyerUserProfileId:userProfileId, status:{ $in: ["pending"] } }, 
        { page, limit, lean:true, select:"sellerBusinessId createdAt totalAmount status", sort:{ createdAt:-1 },
        populate: { path:"sellerBusinessId", select:"companyName" }
    });
    if(!orders.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "No new orders found"));

    // Add orderType flag
    orders.docs = orders.docs.map(({ items, id, ...order }) => ({
        ...order,
        orderType: items?.length > 1 ? "bulk" : "single"
    })); 

    // Response
    return response.status(200).json(new ApiResponse(200, orders, "New orders have been fetch"));    
});

// Fetch processing orders for users
const fetchProcessingOrders = asyncHandler(async (request, response) => {
    const { userProfileId } = request.user.profiles || {};

    // Pagination options
    const { page = 1, limit = 10 } = request.query;

    // Find orders
    const orders = await Order.paginate({ buyerUserProfileId:userProfileId, status:{ $in: ["processing"] } }, 
        { page, limit, lean:true, select:"sellerBusinessId createdAt totalAmount status", sort:{ createdAt:-1 },
        populate: { path:"sellerBusinessId", select:"companyName" }
    });
    if(!orders.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "No processing orders found"));

    // Add orderType flag
    orders.docs = orders.docs.map(({ items, id, ...order }) => ({
        ...order,
        orderType: items?.length > 1 ? "bulk" : "single"
    }));    

    // Response
    return response.status(200).json(new ApiResponse(200, orders, "Processing orders have been fetch"));    
});

// Fetch in-transit orders for users
const fetchInTransitOrders = asyncHandler(async (request, response) => {
    const { userProfileId } = request.user.profiles || {};

    // Pagination options
    const { page = 1, limit = 10 } = request.query;

    // Find orders
    const orders = await Order.paginate({ buyerUserProfileId:userProfileId, status:"in-transit" }, 
        { page, limit, lean:true, select:"sellerBusinessId createdAt totalAmount status", sort:{ createdAt:-1 },
        populate: { path:"sellerBusinessId", select:"companyName" }
    });
    if(!orders.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "No in-transit orders found"));

    // Add orderType flag
    orders.docs = orders.docs.map(({ items, id, ...order }) => ({
        ...order,
        orderType: items?.length > 1 ? "bulk" : "single"
    }));     

    // Response
    return response.status(200).json(new ApiResponse(200, orders, "In-transit orders have been fetch")); 
});

// Fetch delivered orders for users
const fetchDeliveredOrders = asyncHandler(async (request, response) => {
    const { userProfileId } = request.user.profiles || {};

    // Pagination options
    const { page = 1, limit = 10 } = request.query;

    // Find orders
    const orders = await Order.paginate({ buyerUserProfileId:userProfileId, status:"delivered" }, 
        { page, limit, lean:true, select:"sellerBusinessId createdAt totalAmount status", sort:{ createdAt:-1 },
        populate: { path:"sellerBusinessId", select:"companyName" }
    });
    if(!orders.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "No delivered orders found"));

    // Add orderType flag
    orders.docs = orders.docs.map(({ items, id, ...order }) => ({
        ...order,
        orderType: items?.length > 1 ? "bulk" : "single"
    }));   

    // Response
    return response.status(200).json(new ApiResponse(200, orders, "Delivered orders have been fetch")); 
});

// Fetch completed orders for users
const fetchCompletedOrders = asyncHandler(async (request, response) => {
    const { userProfileId } = request.user.profiles || {};

    // Pagination options
    const { page = 1, limit = 10 } = request.query;

    // Find orders
    const orders = await Order.paginate({ buyerUserProfileId:userProfileId, status:"completed" }, 
        { page, limit, lean:true, select:"sellerBusinessId createdAt totalAmount status", sort:{ createdAt:-1 },
        populate: { path:"sellerBusinessId", select:"companyName" }
    });
    if(!orders.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "No completed orders found"));

    // Add orderType flag
    orders.docs = orders.docs.map(({ items, id, ...order }) => ({
        ...order,
        orderType: items?.length > 1 ? "bulk" : "single"
    }));  

    // Response
    return response.status(200).json(new ApiResponse(200, orders, "Completed orders have been fetch")); 
});

// Fetch cancelled orders for user
const fetchCancelledOrders = asyncHandler(async (request, response) => {
    const { userProfileId } = request.user.profiles || {};

    // Pagination options
    const { page = 1, limit = 10 } = request.query;

    // Find orders
    const orders = await Order.paginate({ buyerUserProfileId:userProfileId, status:"cancelled" }, 
        { page, limit, lean:true, select:"sellerBusinessId createdAt totalAmount status", sort:{ createdAt:-1 },
        populate: { path:"sellerBusinessId", select:"companyName" }
    });
    if(!orders.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "No cancelled orders found"));

    // Add orderType flag
    orders.docs = orders.docs.map(({ items, id, ...order }) => ({
        ...order,
        orderType: items?.length > 1 ? "bulk" : "single"
    }));    

    // Response
    return response.status(200).json(new ApiResponse(200, orders, "Cancelled orders have been fetch")); 
});

// ===================== USER SIDE ENDED ===================== //

// ===================== BUSINESS SIDE STARTED ===================== //

// Fetch all business orders
const fetchAllBusinessOrders = asyncHandler(async (request, response) => {
    const { businessProfileId } = request.user.profiles || {};

    // Pagination options
    const { page = 1, limit = 10 } = request.query;

    // Find orders
    const orders = await Order.paginate({ sellerBusinessId:businessProfileId }, 
        { page, limit, lean:true, select:"sellerBusinessId createdAt totalAmount status", sort:{ createdAt:-1 },
        populate:[
            { path:"sellerBusinessId", select:"companyName" },
            { path:"buyerUserProfileId", select:"fullName" },
        ]
    });
    if(!orders.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "No orders found"));

    // Add orderType flag
    orders.docs = orders.docs.map(({ items, id, ...order }) => ({
        ...order,
        orderType: items?.length > 1 ? "bulk" : "single"
    }));    

    // Response
    return response.status(200).json(new ApiResponse(200, orders, "Business orders fetch successfully"));
});

// Fetch new orders for business
const fetchBusinessNewOrders = asyncHandler(async (request, response) => {
    const { businessProfileId } = request.user.profiles || {};

    // Pagination options
    const { page = 1, limit = 10 } = request.query;

    // Find orders
    const orders = await Order.paginate({ sellerBusinessId:businessProfileId, status:{ $in: ["pending"] } }, 
        { page, limit, lean:true, select:"sellerBusinessId createdAt totalAmount status", sort:{ createdAt:-1 },
        populate: { path:"sellerBusinessId", select:"companyName" }
    });
    if(!orders.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "No new orders found"));

    // Add orderType flag
    orders.docs = orders.docs.map(({ items, id, ...order }) => ({
        ...order,
        orderType: items?.length > 1 ? "bulk" : "single"
    }));    

    // Response
    return response.status(200).json(new ApiResponse(200, orders, "New orders have been fetch")); 
});

// Fetch processing orders for business
const fetchBusinessProcessingOrders = asyncHandler(async (request, response) => {
    const { businessProfileId } = request.user.profiles || {};

    // Pagination options
    const { page = 1, limit = 10 } = request.query;

    // Find orders
    const orders = await Order.paginate({ sellerBusinessId:businessProfileId, status:{ $in: ["processing"] } }, 
        { page, limit, lean:true, select:"sellerBusinessId createdAt totalAmount status", sort:{ createdAt:-1 },
        populate: { path:"sellerBusinessId", select:"companyName" }
    });
    if(!orders.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "No processing orders found"));

    // Add orderType flag
    orders.docs = orders.docs.map(({ items, id, ...order }) => ({
        ...order,
        orderType: items?.length > 1 ? "bulk" : "single"
    }));   

    // Response
    return response.status(200).json(new ApiResponse(200, orders, "Processing orders have been fetch")); 
});

// Fetch in-transit orders for business
const fetchBsuinessInTransitOrders = asyncHandler(async (request, response) => {
    const { businessProfileId } = request.user.profiles || {};

    // Pagination options
    const { page = 1, limit = 10 } = request.query;

    // Find orders
    const orders = await Order.paginate({ sellerBusinessId:businessProfileId, status:"in-transit" }, 
        { page, limit, lean:true, select:"sellerBusinessId createdAt totalAmount status", sort:{ createdAt:-1 },
        populate: { path:"sellerBusinessId", select:"companyName" }
    });
    if(!orders.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "No in-transit orders found"));

    // Add orderType flag
    orders.docs = orders.docs.map(({ items, id, ...order }) => ({
        ...order,
        orderType: items?.length > 1 ? "bulk" : "single"
    }));  

    // Response
    return response.status(200).json(new ApiResponse(200, orders, "In-transit orders have been fetch")); 
});

// Fetch completed orders for business
const fetchBusinessDeliveredOrders = asyncHandler(async (request, response) => {
    const { businessProfileId } = request.user.profiles || {};

    // Pagination options
    const { page = 1, limit = 10 } = request.query;

    // Find orders
    const orders = await Order.paginate({ sellerBusinessId:businessProfileId, status:"delivered" }, 
        { page, limit, lean:true, select:"sellerBusinessId createdAt totalAmount status", sort:{ createdAt:-1 },
        populate: { path:"sellerBusinessId", select:"companyName" }
    });
    if(!orders.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "No delivered orders found"));

    // Add orderType flag
    orders.docs = orders.docs.map(({ items, id, ...order }) => ({
        ...order,
        orderType: items?.length > 1 ? "bulk" : "single"
    }));   

    // Response
    return response.status(200).json(new ApiResponse(200, orders, "Delivered orders have been fetch")); 
});

// Fetch completed orders for business
const fetchBusinessCompletedOrders = asyncHandler(async (request, response) => {
    const { businessProfileId } = request.user.profiles || {};

    // Pagination options
    const { page = 1, limit = 10 } = request.query;

    // Find orders
    const orders = await Order.paginate({ sellerBusinessId:businessProfileId, status:"completed" }, 
        { page, limit, lean:true, select:"sellerBusinessId createdAt totalAmount status", sort:{ createdAt:-1 },
        populate: { path:"sellerBusinessId", select:"companyName" }
    });
    if(!orders.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "No completed orders found"));

    // Add orderType flag
    orders.docs = orders.docs.map(({ items, id, ...order }) => ({
        ...order,
        orderType: items?.length > 1 ? "bulk" : "single"
    }));   

    // Response
    return response.status(200).json(new ApiResponse(200, orders, "Completed orders have been fetch")); 
});

// Fetch cancelled orders for business
const fetchBusinessCancelledOrders = asyncHandler(async (request, response) => {
    const { businessProfileId } = request.user.profiles || {};

    // Pagination options
    const { page = 1, limit = 10 } = request.query;

    // Find orders
    const orders = await Order.paginate({ sellerBusinessId:businessProfileId, status:"cancelled" }, 
        { page, limit, lean:true, select:"sellerBusinessId createdAt totalAmount status", sort:{ createdAt:-1 },
        populate: { path:"sellerBusinessId", select:"companyName" }
    });
    if(!orders.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "No cancelled orders found"));

    // Add orderType flag
    orders.docs = orders.docs.map(({ items, id, ...order }) => ({
        ...order,
        orderType: items?.length > 1 ? "bulk" : "single"
    }));    

    // Response
    return response.status(200).json(new ApiResponse(200, orders, "Cancelled orders have been fetch")); 
});

// ===================== BUSINESS SIDE ENDED ===================== //

// View order
const viewOrder = asyncHandler(async (request, response) => {
    const orderId = convertToMongoId(request.params.orderId);
    const { userProfileId } = request.user.profiles || {};

    // Fetch order details
    const orderDetails = await Order.aggregate([
            // Match order ID
            { $match: { _id: orderId } },

            // Lookup user profile
            {
                $lookup: {
                    from: "userprofiles",
                    localField: "buyerUserProfileId",
                    foreignField: "_id",
                    as: "userProfile",
                    pipeline: [
                        { $project: { fullName: 1 } }
                    ]
                }
            },

            // Lookup business profile
            {
                $lookup: {
                    from: "businessprofiles",
                    localField: "sellerBusinessId",
                    foreignField: "_id",
                    as: "businessProfile",
                    pipeline: [
                        { $project: { companyName: 1, sellerEmail: "$b2bContact.supportEmail" } }
                    ]
                }
            },

            // Unwind items
            { $unwind: "$items" },

            // Review lookup
            {
                $lookup: {
                    from: "productreviews",
                    let: { productId: "$items.productId" },
                    pipeline: [
                        { $match: { userProfileId: convertToMongoId(userProfileId) } },
                        { $match: { $expr: { $eq: ["$productId", "$$productId"] } } }
                    ],
                    as: "itemReview"
                }
            },

            // Add review flag
            {
                $addFields: {
                    "items.reviewGiven": {
                        $gt: [{ $size: "$itemReview" }, 0]
                    }
                }
            },

            // Group back
            {
                $group: {
                    _id: "$_id",
                    totalAmount: { $first: "$totalAmount" },
                    status: { $first: "$status" },
                    shippingAddress: { $first: "$shippingAddress" },
                    tracking: { $first: "$tracking" },
                    completedAt: { $first: "$completedAt" },
                    createdAt: { $first: "$createdAt" },
                    cancellation: { $first: "$cancellation" },
                    userProfile: { $first: "$userProfile" },
                    businessProfile: { $first: "$businessProfile" },

                    items: { $push: "$items" },

                    // collect review flags
                    reviewFlags: { $push: "$items.reviewGiven" }
                }
            },

            // compute allReviewed
            {
                $addFields: {
                    allReviewed: {
                        $allElementsTrue: "$reviewFlags"
                    }
                }
            },

            // remove helper array
            { $project: { reviewFlags: 0 } },

            // Unwind profiles
            { $unwind: "$userProfile" },
            { $unwind: "$businessProfile" }
    ]);
    if(!orderDetails.length) throw new ApiError(404, "No order found");

    // Get related products separately
    const order = await Order.findById(orderId)
    .populate({ path: "items.productId", select: "title image status" })
    .lean();

    if(!order) throw new ApiError(404, "No order found");

    // Fetch products
    const products = order.items.map(item => ({
        _id: item.productId?._id,
        title: item.productId?.title,
        image: item.productId?.image,
        quantity: item.quantity,
        priceAtPurchase: item.priceAtPurchase
    }));

    let disputeWinner = null;
    let adminReason = null;
    let refundAmount = 0;
    // Get dispute status to determine winner
    if(["delivered", "completed", "disputed"].includes(order.status))
    {
        const dispute = await Dispute.findOne({ orderId }).select("adminDecision adminNotes refundAmount").lean();
        if(dispute)
        {
            disputeWinner = dispute.adminDecision === "reject" ? "seller" : "buyer";
            adminReason = dispute.adminNotes;
            refundAmount = Number(dispute.refundAmount);
        }
    }

    // Prepare payload
    const payload = {
        orderDetails: orderDetails[0],
        products
    };

    // Add on payload
    if(disputeWinner) payload.disputeWinner = disputeWinner;
    if(adminReason) payload.adminReason = adminReason;
    if(refundAmount) payload.refundAmount = refundAmount;
    
    // Response
    return response.status(200).json(new ApiResponse(200, payload, "Order details have been fetched"));
});

// Fetch unreviewed orders
const fetchUnreviewedOrders = asyncHandler(async (request, response) => {
    const { userProfileId } = request.user.profiles || {};
    const { page = 1, limit = 10 } = request.query;

    // Aggregation
    const unreviewedOrders = await Order.aggregatePaginate([
        // Find completed orders of this user
        { 
            $match: { buyerUserProfileId: convertToMongoId(userProfileId), status: "completed" } 
        },

        // Store items count BEFORE unwind
        { 
            $addFields: { itemsCount: { $size: "$items" } } 
        },

        // Expand items
        { $unwind: "$items" },

        // Lookup reviews
        {
            $lookup: {
                from: "productreviews",
                let: { productId: "$items.productId" },
                pipeline: [
                    { $match: { userProfileId: convertToMongoId(userProfileId) } },
                    { $match: { $expr: { $eq: ["$productId", "$$productId"] } } }
                ],
                as: "reviews"
            }
        },

        // Keep only unreviewed items
        { $match: { "reviews.0": { $exists: false } } },

        // Group back to order level
        {
            $group: {
                _id: "$_id",
                sellerBusinessId: { $first: "$sellerBusinessId" },
                totalAmount: { $first: "$totalAmount" },
                status: { $first: "$status" },
                createdAt: { $first: "$createdAt" },
                itemsCount: { $first: "$itemsCount" } // keep it
            }
        },

        // Add bulk bulk flag
        {
            $addFields: {
                orderType: {
                    $cond: [
                        { $gt: ["$itemsCount", 1] },
                        "bulk",
                        "single"
                    ]
                }
            }
        },

        // Populate seller business
        {
            $lookup: {
                from: "businessprofiles",
                localField: "sellerBusinessId",
                foreignField: "_id",
                as: "sellerBusinessId"
            }
        },
        { $unwind: "$sellerBusinessId" },

        // Sort
        { $sort: { createdAt: -1 } },

        // Projection
        {
            $project: {
                totalAmount: 1,
                status: 1,
                createdAt: 1,
                orderType: 1,
                "sellerBusinessId._id": 1,
                "sellerBusinessId.companyName": 1
            }
        }

    ], { page, limit });
    if(!unreviewedOrders.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "No unreviewed orders found"));
    
    // Response
    return response.status(200).json(new ApiResponse(200, unreviewedOrders, "Unreviewed orders fetched"));
});

module.exports = { createOrder, verifyStripePaymentForOrders, createOrderWithWallet, completeOrder, updateOrderStatusBySeller, 
fetchAllUserOrders, fetchAllBusinessOrders, fetchProcessingOrders, fetchInTransitOrders, fetchCompletedOrders, fetchCancelledOrders,
fetchBusinessProcessingOrders, fetchBsuinessInTransitOrders, fetchBusinessCompletedOrders, fetchBusinessCancelledOrders,
viewOrder, cancelOrder, updateOrderTrackingInfo, fetchNewOrders, fetchBusinessNewOrders, fetchDeliveredOrders, 
fetchBusinessDeliveredOrders, fetchUnreviewedOrders };