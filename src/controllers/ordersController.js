const Order = require("../models/orders");
const Product = require("../models/products");
const UserProfile = require("../models/userProfile");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const Stripe = require("stripe");
const mongoose = require("mongoose");

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
        const { buyerUserProfileId, totalAmount, shippingAddress, items } = stripeSession.metadata;
        const parsedItems = JSON.parse(items);

        // Stock deduction
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
        }

        // Create order
        const order = await Order.create([{
            buyerUserProfileId,
            totalAmount,
            status: "processing",
            shippingAddress,
            items: parsedItems
        }], { session:dbSession });
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

module.exports = { createOrder, verifyStripePaymentForOrders };