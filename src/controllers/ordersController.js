const Order = require("../models/orders");
const Product = require("../models/products");
const UserProfile = require("../models/userProfile");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const Stripe = require("stripe");
const mongoose = require("mongoose");
const EscrowTransaction = require("../models/escrowTrasanction");
const Wallet = require("../models/walletModel");
const BusinessProfile = require("../models/businessProfileSchema");

// Create order
const createOrder = asyncHandler(async (request, response) => {
    // Validate user profile
    const { _id } = request.user;
    const userProfile = await UserProfile.findOne({ userId: _id }).select("_id").lean();
    if(!userProfile) throw new ApiError(404, "User profile not found! Invalid user profile ID");
    
    // Validate
    const { totalAmount, shippingAddress, items } = request.body;
    if (!totalAmount) throw new ApiError(400, "Amount is required");
    if (!shippingAddress) throw new ApiError(400, "Shipping address is required");
    if (!items || !items.length) throw new ApiError(400, "Product item is required");

    
    // 1. Pehle product se Seller ID nikalna zaroori hai
    const firstProduct = await Product.findById(items[0].productId).select("businessId");
    if (!firstProduct) throw new ApiError(404, "Product not found");
    const sellerBusinessId = firstProduct.businessId;

    // Stock check
    for (const item of items) 
    {
        const { productId, quantity } = item;
        if(!quantity || quantity <= 0) throw new ApiError(400, "Invalid product quantity");
        
        const product = await Product.findById(productId).select("title stockQty");
        if(!product) throw new ApiError(404, "Product not found");
        if(product.stockQty < Number(quantity)) throw new ApiError(400,`Only ${product.stockQty} unit(s) available for "${product.title}"`);
    }

    // Stripe instance
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // Create Stripe session
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        line_items: [{
            price_data: {
                currency: "usd",
                unit_amount: Number(totalAmount) * 100,
                product_data: {
                    name: "Product purchasing",
                    metadata: {
                        brand: "360-GMP",
                        category: "Products"
                    }
                }
            },
            quantity: 1
        }],
        metadata: {
            buyerUserProfileId: userProfile._id.toString(),
            sellerBusinessId,
            totalAmount,
            shippingAddress,
            items: JSON.stringify(items)
        },
        success_url: `${process.env.BACKEND_URL}/api/v1/orders/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.BACKEND_URL}/api/v1/orders/stripe/cancel`
    });

    if (!session) {
        throw new ApiError(400, "Stripe session creation failed");
    }

    return response
        .status(200)
        .json(new ApiResponse(200, session.url, "Checkout url generated"));
});

// Verify stripe payment for orders
const verifyStripePaymentForOrders = asyncHandler(async (request, response) => {
    const { session_id } = request.query;
    if (!session_id) throw new ApiError(400, "Session ID is missing");

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const stripeSession = await stripe.checkout.sessions.retrieve(session_id);
    if (!stripeSession) throw new ApiError(404, "Session not found");
    if (stripeSession.payment_status !== "paid") throw new ApiError(400, "Payment not completed");

    // Start MongoDB transaction
    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();
    try 
    {
        const { buyerUserProfileId,sellerBusinessId, totalAmount, shippingAddress, items } = stripeSession.metadata;
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

        // Create order
        const [order] = await Order.create([{
            buyerUserProfileId,
            sellerBusinessId,
            totalAmount,
            status: "paid",
            shippingAddress,
            items: itemsWithPrice
        }], { session:dbSession });

        const amount = Number(totalAmount);
        const platformFee = amount * 0.10; // 10% Fee
        const netAmount = amount - platformFee; // Seller ka hissa

        await EscrowTransaction.create([{
            orderId: order._id,
            sellerId: sellerBusinessId,
            buyerId: buyerUserProfileId,
            totalAmount: amount,
            platformFee: platformFee,
            netAmount: netAmount,
            status: 'held' // Paisa hold ho gaya
        }], { session: dbSession });

        await Wallet.findOneAndUpdate(
            { businessId: sellerBusinessId },
            { $inc: { pendingBalance: netAmount } },
            { upsert: true, session: dbSession }
        );


        await dbSession.commitTransaction();
        dbSession.endSession();
        return response.status(201).json(new ApiResponse(201, order, "Order has been created"));

    } 
    catch(error) 
    {
        await dbSession.abortTransaction();
        dbSession.endSession();
        throw error;
    }
});

// Complete order
// First check if the order status and authenticated by the real buyer
// iskay baaad ham is pr transaction start karega us pr ya hoga kay order status complete hoga ya escrow release hoga aur wallet update hoga


const completeOrder = asyncHandler(async (request, response) => {
    const { orderId } = request.params;
    const { _id } = request.user;

    if (!orderId) throw new ApiError(400, "Order ID is missing");

    const order = await Order.findById(orderId);
    if (!order) throw new ApiError(404, "Order not found");

    const buyerProfile = await UserProfile.findOne({ userId: _id });
    if (!buyerProfile) throw new ApiError(404, "User profile not found");
    if (buyerProfile._id.toString() !== order.buyerUserProfileId.toString()) 
        throw new ApiError(403, "You are not authorized to complete this order");

    const allowedStatuses = ["paid", "processing", "shipped", "delivered"];
    
    if (!allowedStatuses.includes(order.status)) {
        throw new ApiError(400, `Order cannot be completed in its current status: ${order.status}`);
    }

    const escrow = await EscrowTransaction.findOne({ orderId: order._id, status: "held" });
    if (!escrow) throw new ApiError(404, "Escrow record not found or already released");

    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try {
        order.status = "completed";
        await order.save({ session: dbSession });

        escrow.status = "released";
        await escrow.save({ session: dbSession });

        await Wallet.findOneAndUpdate(
            { businessId: order.sellerBusinessId },
            { $inc: { 
                pendingBalance: -escrow.netAmount,
                availableBalance: escrow.netAmount, } },
            { upsert: true, session: dbSession }
        );

        await dbSession.commitTransaction();
        dbSession.endSession();
        return response.status(200).json(new ApiResponse(200, {}, "Order completed successfully"));

    } catch (error) {
        await dbSession.abortTransaction();
        dbSession.endSession();
        throw error;
    }
    
});


const updateOrderStatusBySeller = asyncHandler(async (request, response) => {
    const { orderId } = request.params;
    const { status } = request.body;  
    const { _id } = request.user; 

    const business = await BusinessProfile.findOne({ ownerUserId: _id });
    if (!business) throw new ApiError(404, "Business profile not found");

    const order = await Order.findById(orderId);
    if (!order) throw new ApiError(404, "Order not found");

    if (order.sellerBusinessId.toString() !== business._id.toString()) {
        throw new ApiError(403, "Aap is order ka status change nahi kar sakte.");
    }

    // Seller order ko "completed" ya "paid" khud se nahi kar sakta
    const sellerAllowedStatuses = ["processing", "shipped", "delivered"];
    if (!sellerAllowedStatuses.includes(status)) {
        throw new ApiError(400, "Invalid status update.");
    }

    order.status = status;
    await order.save();

    return response.status(200).json(new ApiResponse(200, order, `Status updated to ${status}`));
});

module.exports = { createOrder, verifyStripePaymentForOrders ,completeOrder, updateOrderStatusBySeller};