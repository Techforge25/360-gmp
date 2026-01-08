const Order = require("../models/orders");
const Product = require("../models/products");
const UserProfile = require("../models/userProfile");
const BusinessProfile = require("../models/businessProfileSchema");
const EscrowTransaction = require("../models/escrowTrasanction");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../utils/validate");
const { createCheckoutSchema, updateOrderStatusSchema } = require("../validations/orderValidator");
const Stripe = require("stripe");

// Step 1: Create Checkout Session (Before Payment)
// User sends cart items, we create Stripe checkout session
const createCheckoutSession = asyncHandler(async (request, response) => {
    const userId = request.user._id;
    const payload = validate(createCheckoutSchema, request.body);
    const { items, shippingAddress } = payload;

    // Validate input
    if(!items || !Array.isArray(items) || items.length === 0) {
        throw new ApiError(400, "Items array is required and cannot be empty");
    }
    if(!shippingAddress) {
        throw new ApiError(400, "Shipping address is required");
    }

    // Validate and prepare line items for Stripe
    const lineItems = [];
    let totalAmount = 0;
    const orderItems = [];
    let sellerBusinessId = null; // Track seller business ID

    // Process each item
    for(const item of items) {
        const { productId, quantity } = item;

        // Validate item
        if(!productId || !quantity || quantity < 1) {
            throw new ApiError(400, "Invalid item data: productId and quantity (min 1) are required");
        }

        // Fetch product from database
        const product = await Product.findById(productId).lean();
        if(!product) {
            throw new ApiError(404, `Product not found with ID: ${productId}`);
        }

        // Check stock availability
        if(product.stockQty < quantity) {
            throw new ApiError(400, `Insufficient stock for product: ${product.title}. Available: ${product.stockQty}`);
        }

        // Calculate item total
        const itemTotal = product.pricePerUnit * quantity;
        totalAmount += itemTotal;

        // Track seller business ID (assuming single seller per order)
        if(!sellerBusinessId && product.businessId) {
            sellerBusinessId = product.businessId.toString();
        }

        // Prepare order item (to save after payment)
        orderItems.push({
            productId: product._id,
            name: product.title,
            priceAtPurchase: product.pricePerUnit,
            quantity: quantity,
            image: product.image,
            businessId: product.businessId // Store business ID for escrow
        });

        // Prepare Stripe line item
        lineItems.push({
            price_data: {
                currency: "usd",
                unit_amount: Math.round(product.pricePerUnit * 100), // Convert to cents
                product_data: {
                    name: product.title,
                    images: product.image ? [product.image] : [],
                    metadata: {
                        productId: product._id.toString(),
                        businessId: product.businessId.toString()
                    }
                }
            },
            quantity: quantity
        });
    }

    // Get user profile
    const userProfile = await UserProfile.findOne({ userId }).select("_id");

    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // Create Stripe checkout session
    // Funds will be held in platform account (escrow) - no immediate transfer to seller
    // When order is delivered, we'll manually transfer funds to seller using Stripe Transfer
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        line_items: lineItems,
        payment_intent_data: {
            // Metadata for escrow tracking
            metadata: {
                escrow: "true",
                order_type: "marketplace"
            }
        },
        metadata: { 
            userId: userId.toString(),
            userProfileId: userProfile?._id?.toString() || "",
            shippingAddress: shippingAddress,
            orderItems: JSON.stringify(orderItems),
            sellerBusinessId: sellerBusinessId || "" // Seller business ID for escrow
        },
        success_url: `${process.env.FRONTEND_URL || process.env.BACKEND_URL}/api/v1/orders/verify-payment?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL || process.env.BACKEND_URL}/checkout?cancelled=true`
    });

    if(!session) {
        throw new ApiError(500, "Failed to create checkout session");
    }

    // Return checkout URL and session details
    return response.status(200).json(new ApiResponse(200, {
        checkoutUrl: session.url,
        sessionId: session.id,
        totalAmount: totalAmount
    }, "Checkout session created successfully"));
});

// Step 2: Verify Payment and Create Order (After Payment)
// This is called after user completes payment on Stripe
const verifyPaymentAndCreateOrder = asyncHandler(async (request, response) => {
    const { session_id } = request.query;
    
    if(!session_id) {
        throw new ApiError(400, "Session ID is required");
    }

    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // Retrieve checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if(!session) {
        throw new ApiError(404, "Checkout session not found");
    }

    // Check if payment was successful
    if(session.payment_status !== "paid") {
        throw new ApiError(400, `Payment not completed. Status: ${session.payment_status}`);
    }

    // Extract metadata
    const { userId, userProfileId, shippingAddress, orderItems, sellerBusinessId } = session.metadata;

    // Parse order items from metadata
    const items = JSON.parse(orderItems);

    // Calculate total amount from session
    const totalAmount = session.amount_total / 100; // Convert from cents to dollars

    // Get payment intent ID from session
    const intentId = session.payment_intent;

    // Check if order already exists (idempotency check)
    const existingOrder = await Order.findOne({ stripeSessionId: session_id });
    if(existingOrder) {
        return response.status(200).json(new ApiResponse(200, existingOrder, "Order already created"));
    }

    // Get seller business info
    const sellerBusiness = sellerBusinessId ? await BusinessProfile.findById(sellerBusinessId).lean() : null;

    // Create order in database
    const order = await Order.create({
        userId: userId,
        userProfileId: userProfileId || null,
        totalAmount: totalAmount,
        orderStatus: "Processing",
        shippingAddress: shippingAddress,
        items: items.map(item => ({
            productId: item.productId,
            name: item.name,
            priceAtPurchase: item.priceAtPurchase,
            quantity: item.quantity,
            image: item.image
        })),
        paymentStatus: "Completed",
        paymentId: intentId,
        stripeSessionId: session_id,
        escrowStatus: "held", // Funds held in escrow
        sellerBusinessId: sellerBusiness?._id || null,
        sellerStripeAccountId: sellerBusiness?.stripeConnectAccountId || null
    });

    if(!order) {
        throw new ApiError(500, "Failed to create order");
    }

    // Create Escrow Transaction
    const escrowTransaction = await EscrowTransaction.create({
        orderId: order._id,
        amount: totalAmount,
        currency: "usd",
        status: "held",
        paymentIntentId: intentId,
        sellerBusinessId: sellerBusiness?._id || null,
        sellerStripeAccountId: sellerBusiness?.stripeConnectAccountId || null,
        buyerUserId: userId,
        releaseCondition: "order_delivered"
    });

    if(!escrowTransaction) {
        throw new ApiError(500, "Failed to create escrow transaction");
    }

    // Link escrow transaction to order
    order.escrowTransactionId = escrowTransaction._id;
    await order.save();

    // Update product stock quantities
    for(const item of items) {
        await Product.findByIdAndUpdate(
            item.productId,
            { $inc: { stockQty: -item.quantity } }
        );
    }

    // Populate product details for response
    await order.populate("items.productId", "title image pricePerUnit");
    await order.populate("escrowTransactionId");

    return response.status(201).json(new ApiResponse(201, {
        order,
        escrowTransaction,
        message: "Payment verified, order created, and funds held in escrow"
    }, "Payment verified and order created successfully. Funds held in escrow until delivery confirmation."));
});

// Step 3: Get User Orders
// Get all orders for logged-in user
const getUserOrders = asyncHandler(async (request, response) => {
    const userId = request.user._id;
    const { page = 1, limit = 10 } = request.query;

    const orders = await Order.find({ userId })
        .populate("items.productId", "title image pricePerUnit")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .lean();

    const totalOrders = await Order.countDocuments({ userId });

    return response.status(200).json(new ApiResponse(200, {
        orders,
        pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalOrders / limit),
            totalOrders,
            limit: parseInt(limit)
        }
    }, "User orders fetched successfully"));
});

// Step 4: Get Single Order Details
const getOrderById = asyncHandler(async (request, response) => {
    const userId = request.user._id;
    const { orderId } = request.params;

    const order = await Order.findOne({ _id: orderId, userId })
        .populate("items.productId", "title image pricePerUnit detail")
        .lean();

    if(!order) {
        throw new ApiError(404, "Order not found");
    }

    return response.status(200).json(new ApiResponse(200, order, "Order details fetched successfully"));
});

// Step 5: Update Order Status (Admin/Business use)
const updateOrderStatus = asyncHandler(async (request, response) => {
    const { orderId } = request.params;
    const payload = validate(updateOrderStatusSchema, request.body);
    const { orderStatus } = payload;

    const order = await Order.findByIdAndUpdate(
        orderId,
        { orderStatus },
        { new: true }
    ).populate("items.productId", "title image pricePerUnit");

    if(!order) {
        throw new ApiError(404, "Order not found");
    }

    return response.status(200).json(new ApiResponse(200, order, "Order status updated successfully"));
});

module.exports = {
    createCheckoutSession,
    verifyPaymentAndCreateOrder,
    getUserOrders,
    getOrderById,
    updateOrderStatus
};
