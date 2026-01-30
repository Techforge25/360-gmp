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
const { emptyList } = require("../constants");
const convertToMongoId = require("../utils/convertToMongoId");

// Create order
const createOrder = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Get user profile
    const userProfile = await UserProfile.findOne({ userId }).select("_id").lean();
    if(!userProfile) throw new ApiError(404, "User profile not found! Invalid user profile ID");

    // Validate request body
    const { totalAmount, shippingAddress, items } = request.body;
    if(!totalAmount) throw new ApiError(400, "Amount is required");
    if(!shippingAddress) throw new ApiError(400, "Shipping address is required");
    if(!items || !items.length) throw new ApiError(400, "Product item is required");

    // Variables
    let sellerBusinessId = null;
    let serverComputedTotal = 0;

    // Loop through items for validation & calculation
    for(const item of items)
    {
        const { productId, quantity } = item;

        // Validate quantity
        if(!quantity || quantity <= 0) throw new ApiError(400, "Invalid product quantity");

        // Trial user cannot purchase in bulk
        if(request.user.plan?.name === "TRIAL" && quantity > 1) throw new ApiError(400, "You cannot purchase in bulk within Trial period! Please upgrade");

        // Fetch product from DB (price & shipping must come from server)
        const product = await Product.findById(productId).select("title stockQty pricePerUnit shippingCost businessId");
        if(!product) throw new ApiError(404, "Product not found");

        // Enforce single seller per order
        if(!sellerBusinessId)
        {
            sellerBusinessId = product.businessId.toString();
        }
        else if(sellerBusinessId !== product.businessId.toString())
        {
            throw new ApiError(400, "Multiple sellers in one order are not allowed");
        }

        // Stock check
        if(product.stockQty < Number(quantity)) throw new ApiError(400, `Only ${product.stockQty} unit(s) available for "${product.title}"`);

        // Compute item total (SERVER TRUSTED)
        const itemTotal = Number(product.pricePerUnit) * Number(quantity) + Number(product.shippingCost);
        serverComputedTotal += itemTotal;
    }

    // Final amount validation
    if(Number(totalAmount) !== Number(serverComputedTotal)) throw new ApiError(400, "Invalid total amount");

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
            buyerUserProfileId: userProfile._id.toString(),
            sellerBusinessId,
            totalAmount: serverComputedTotal,
            shippingAddress,
            items: JSON.stringify(items)
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
        const { buyerUserProfileId, sellerBusinessId, totalAmount, shippingAddress, items } = stripeSession.metadata;
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

        // Hold on escrow
        await EscrowTransaction.create([{
            orderId: order._id,
            sellerId: sellerBusinessId,
            buyerId: buyerUserProfileId,
            totalAmount: amount,
            platformFee: Number(platformFee),
            netAmount: Number(netAmount),
            status: 'held' // Paisa hold ho gaya
        }], { session:dbSession });

        // Update wallet
        await Wallet.findOneAndUpdate(
            { ownerId:sellerBusinessId, ownerModel:"BusinessProfile" },
            { $inc: { pendingBalance:netAmount } },
            { upsert:true, session:dbSession }
        );

        // Complete transaction
        await dbSession.commitTransaction();
        dbSession.endSession();

        // Response
        // return response.status(201).json(new ApiResponse(201, order, "Order has been created"));
        return response.status(303).redirect("https://github.com");

    } 
    catch(error) 
    {
        await dbSession.abortTransaction();
        dbSession.endSession();
        throw error;
    }
});

// Fetch all orders
const fetchAllOrders = asyncHandler(async (request, response) => {
    const userId = request.user._id;
    const userProfile = await UserProfile.findOne({ userId }).select("_id").lean();
    if(!userProfile) throw new ApiError(404, "User profile not found! Invalid user profile ID");

    // Pagination options
    const { page = 1, limit = 10 } = request.query;

    // Find orders
    const orders = await Order.paginate({ buyerUserProfileId:userProfile._id }, 
    { page, limit, lean:true, select:"-updatedAt -__v" });
    if(!orders.docs?.length) return response.status(200).json(new ApiResponse(200, emptyList, "No orders found"));

    // Response
    return response.status(200).json(new ApiResponse(200, orders, "Order Fetch SuccessFully"));
});

// Complete order
// First check if the order status and authenticated by the real buyer
// iskay baaad ham is pr transaction start karega us pr ya hoga kay order status complete hoga ya escrow release hoga aur wallet update hoga
const completeOrder = asyncHandler(async (request, response) => {
    const userId = request.user._id;
    const { orderId } = request.params;

    // Find order
    const order = await Order.findById(orderId);
    if(!order) throw new ApiError(404, "Order not found");

    // Find buyer profile
    const buyerProfile = await UserProfile.findOne({ userId });
    if(!buyerProfile) throw new ApiError(404, "User profile not found");

    // Check permissions
    if(buyerProfile._id.toString() !== order.buyerUserProfileId.toString()) throw new ApiError(403, "You are not authorized to complete this order");
    const allowedStatuses = ["paid", "processing", "shipped", "delivered"];
    
    // Check status
    if(!allowedStatuses.includes(order.status)) throw new ApiError(400, `Order cannot be completed in its current status: ${order.status}`);

    // Find escrow
    const escrow = await EscrowTransaction.findOne({ orderId:order._id, status:"held" });
    if (!escrow) throw new ApiError(404, "Escrow record not found or already released");

    // Start db session for safe transaction
    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try 
    {
        // Update order status
        order.status = "completed";
        await order.save({ session:dbSession });

        // Order escrow status
        escrow.status = "released";
        await escrow.save({ session:dbSession });

        // Update wallet
        await Wallet.findOneAndUpdate(
            { ownerId:order.sellerBusinessId, ownerModel:"BusinessProfile" },
            { $inc: { 
                pendingBalance: -escrow.netAmount,
                availableBalance: escrow.netAmount,
                totalEarned: escrow.netAmount } },
            { upsert:true, session:dbSession }
        );

        // Commit changes
        await dbSession.commitTransaction();
        dbSession.endSession();

        // Response
        return response.status(200).json(new ApiResponse(200, {}, "Order completed successfully"));

    } 
    catch(error) 
    {
        await dbSession.abortTransaction();
        dbSession.endSession();
        throw error;
    }
});

// Update order status by seller
const updateOrderStatusBySeller = asyncHandler(async (request, response) => {
    const userId = request.user._id;
    const { orderId } = request.params;
    const { status } = request.body;   
    
    // Find business
    const business = await BusinessProfile.findOne({ ownerUserId:userId });
    if(!business) throw new ApiError(404, "Business profile not found");

    // Find order
    const order = await Order.findById(orderId);
    if(!order) throw new ApiError(404, "Order not found");
    if(order.sellerBusinessId.toString() !== business._id.toString()) throw new ApiError(403, "You cannot change the status of this order");

    // Seller order ko "completed" ya "paid" khud se nahi kar sakta
    const sellerAllowedStatuses = ["processing", "shipped", "delivered"];
    if(!sellerAllowedStatuses.includes(status)) throw new ApiError(400, "Invalid status update.");

    // Save status
    order.status = status;
    await order.save();

    // Response
    return response.status(200).json(new ApiResponse(200, order, `Status updated to ${status}`));
});

// Fetch processing orders
const fetchProcessingOrders = asyncHandler(async (request, response) => {
    const userId = request.user._id;
    const userProfile = await UserProfile.findOne({ userId }).select("_id").lean();
    if(!userProfile) throw new ApiError(404, "User profile not found! Invalid user profile ID");

    // Pagination options
    const { page = 1, limit = 10 } = request.query;

    // Find orders
    const orders = await Order.paginate({ buyerUserProfileId:userProfile._id, status:{ $in: ["pending", "processing"] } }, 
    { page, limit, lean:true, select:"-updatedAt -__v" });
    if(!orders.docs?.length) return response.status(200).json(new ApiResponse(200, emptyList, "No processing orders found"));

    // Response
    return response.status(200).json(new ApiResponse(200, orders, "Processing order have been fetch"));    
});

// Fetch in-transit orders
const fetchInTransitOrders = asyncHandler(async (request, response) => {
    const userId = request.user._id;
    const userProfile = await UserProfile.findOne({ userId }).select("_id").lean();
    if(!userProfile) throw new ApiError(404, "User profile not found! Invalid user profile ID");

    // Pagination options
    const { page = 1, limit = 10 } = request.query;

    // Find orders
    const orders = await Order.paginate({ buyerUserProfileId:userProfile._id, status:"in-transit" }, 
    { page, limit, lean:true, select:"-updatedAt -__v" });
    if(!orders.docs?.length) return response.status(200).json(new ApiResponse(200, emptyList, "No in-transit orders found"));

    // Response
    return response.status(200).json(new ApiResponse(200, orders, "In-transit orders have been fetch")); 
});

// Fetch in-transit orders
const fetchCompletedOrders = asyncHandler(async (request, response) => {
    const userId = request.user._id;
    const userProfile = await UserProfile.findOne({ userId }).select("_id").lean();
    if(!userProfile) throw new ApiError(404, "User profile not found! Invalid user profile ID");

    // Pagination options
    const { page = 1, limit = 10 } = request.query;

    // Find orders
    const orders = await Order.paginate({ buyerUserProfileId:userProfile._id, status:"completed" }, 
    { page, limit, lean:true, select:"-updatedAt -__v" });
    if(!orders.docs?.length) return response.status(200).json(new ApiResponse(200, emptyList, "No completed orders found"));

    // Response
    return response.status(200).json(new ApiResponse(200, orders, "Completed orders have been fetch")); 
});

// Fetch in-transit orders
const fetchCancelledOrders = asyncHandler(async (request, response) => {
    const userId = request.user._id;
    const userProfile = await UserProfile.findOne({ userId }).select("_id").lean();
    if(!userProfile) throw new ApiError(404, "User profile not found! Invalid user profile ID");

    // Pagination options
    const { page = 1, limit = 10 } = request.query;

    // Find orders
    const orders = await Order.paginate({ buyerUserProfileId:userProfile._id, status:"cancelled" }, 
    { page, limit, lean:true, select:"-updatedAt -__v" });
    if(!orders.docs?.length) return response.status(200).json(new ApiResponse(200, emptyList, "No cancelled orders found"));

    // Response
    return response.status(200).json(new ApiResponse(200, orders, "Cancelled orders have been fetch")); 
});

// View order
const viewOrder = asyncHandler(async (request, response) => {
    const orderId = convertToMongoId(request.params.orderId);

    // Fetch order details
    const orderDetails = await Order.aggregate([
        // Match order ID
        {
            $match:{ _id:orderId }
        },

        // Lookup for user profile
        {
            $lookup:{
                from:"userprofiles",
                localField:"buyerUserProfileId",
                foreignField:"_id",
                as:"userProfile",
                pipeline:[
                    { $project:{ fullName:1 } }
                ]
            }
        },

        // Lookup for business profile
        {
            $lookup:{
                from:"businessprofiles",
                localField:"sellerBusinessId",
                foreignField:"_id",
                as:"buisnessProfile",
                pipeline:[
                    { $project:{ companyName:1 } }
                ]
            }
        },   
        
        // Lookup for products
        {
            $lookup:{
                from:"products",
                localField:"items.productId",
                foreignField:"_id",
                as:"products",
                pipeline:[
                    { $project:{ title:1 } }
                ]
            }
        },         

        // Unwind
        { $unwind:"$userProfile" },
        { $unwind:"$buisnessProfile" },

        // Final projection
        { 
            $project:{ totalAmount:1, status:1, shippingAddress:1, items:1, 
            createdAt:1, userProfile:1, buisnessProfile:1, products:1 } 
        }
    ]);
    if(!orderDetails.length) throw new ApiError(404, "No order found");

    // Response
    return response.status(200).json(new ApiResponse(200, orderDetails[0], "Order details have been fetched"));
});

module.exports = { createOrder, verifyStripePaymentForOrders ,completeOrder, updateOrderStatusBySeller, 
fetchAllOrders, fetchProcessingOrders, fetchInTransitOrders, fetchCompletedOrders, fetchCancelledOrders, viewOrder };