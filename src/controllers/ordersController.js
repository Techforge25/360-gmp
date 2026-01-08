const Order = require("../models/orders");
const UserProfile = require("../models/userProfile");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const Stripe = require("stripe");

// Create order
const createOrder = asyncHandler(async (request, response) => {
    // Validate user profile
    const { _id } = request.user;
    const userProfile = await UserProfile.findOne({ userId:_id }).select("_id").lean();
    if(!userProfile) throw new ApiError(404, "User profile not found! Invalid user profile ID");

    // Validate json data
    const { totalAmount, shippingAddress, items } = request.body;
    if(!totalAmount) throw new ApiError(400, "Amount is required");
    if(!shippingAddress) throw new ApiError(400, "Shipping address is required");
    if(!items) throw new ApiError(400, "Product item is required");

    // Stripe instance
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // Create session
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        line_items: [{
            price_data: {
                currency: "usd",
                unit_amount: Number(totalAmount) * 100,
                product_data: { 
                    name: `Product purchasing`,
                    metadata:{
                        brand: "360-GMP",
                        category: "Products"
                    }
                },
            },
            quantity: 1,
        }],
        metadata: { buyerUserProfileId:userProfile._id.toString(), totalAmount, shippingAddress, items: JSON.stringify(items) },
        success_url: `${process.env.BACKEND_URL}/api/v1/orders/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.BACKEND_URL}/api/v1/orders/stripe/cancel`
    });

    // Validate
    if(!session) throw new ApiError(400, "Stripe session creation failed");

    // Response
    return response.status(200).json(new ApiResponse(200, session.url, "Checkout url generated"));    
});

// Verify stripe payment for orders
const verifyStripePaymentForOrders = asyncHandler(async (request, response) => {
    const { session_id } = request.query;
    if(!session_id) throw new ApiError(400, "Session ID is missing");
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // Get checkout session details
    const session = await stripe.checkout.sessions.retrieve(session_id);

    // Validate session
    if(!session) throw new ApiError(404, "Session not found");

    // Check payment status
    if(session.payment_status === "paid") 
    {
        // Get metadata
        const { buyerUserProfileId, totalAmount, shippingAddress, items } = session.metadata;  
        
        // Parsed json
        const parsedItems = JSON.parse(items);
        
        // Save to db
        const order = await Order.create({ buyerUserProfileId, totalAmount, status:"processing", shippingAddress, items:parsedItems });
        if(!order) throw new ApiError(500, "Failed to create an order");

        // Response
        return response.status(201).json(new ApiResponse(201, items, "Order has been created"));
    } 
    else 
    {
        throw new ApiError(400, "Payment not completed");
    }
});

module.exports = { createOrder, verifyStripePaymentForOrders };