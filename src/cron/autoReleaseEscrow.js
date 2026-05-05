const cron = require("node-cron");
const mongoose = require("mongoose");
const Order = require("../models/orders");
const EscrowTransaction = require("../models/escrowTrasanction");
const Wallet = require("../models/walletModel");
const sendNotification = require("../utils/sendNotification");

const timer = "0 */12 * * *";
// const timer = "*/4 * * * *";

// Auto release escrow funds after 14 days of delivery
cron.schedule(timer, async () => {
    console.log("Running auto escrow release job");

    // Calculate date (14 days ago)
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    // const fourMinutesAgo = new Date(Date.now() - 4 * 60 * 1000);

    // Find eligible orders
    const orders = await Order.find({ status:"delivered", "tracking.deliveredAt":{ $lte: fourteenDaysAgo }})
    .populate({ path:"sellerBusinessId", select:"ownerUserId" })
    .select("_id sellerBusinessId");

    // If no orders found
    if(!orders.length) return console.log("No orders eligible for auto release");

    // Process each order
    for(const order of orders)
    {
        // Start DB transaction
        const dbSession = await mongoose.startSession();
        dbSession.startTransaction();

        try
        {
            // Find escrow record
            const escrow = await EscrowTransaction.findOne({ orderId:order._id, status:"held" })
            .populate({ path:"sellerId", select:"ownerUserId" })
            .session(dbSession);

            // Skip if escrow not found
            if(!escrow)
            {
                await dbSession.abortTransaction();
                dbSession.endSession();
                continue;
            }

            // Update order status
            await Order.findByIdAndUpdate(order._id, { status:"completed" }, { session:dbSession });

            // Update escrow status
            escrow.status = "released";
            await escrow.save({ session:dbSession });

            // Release funds to seller wallet
            await Wallet.findOneAndUpdate(
                { ownerId:order.sellerBusinessId, ownerModel:"BusinessProfile" },
                {
                    $inc:{
                        pendingBalance:-escrow.netAmount,
                        availableBalance:escrow.netAmount,
                        totalEarned:escrow.netAmount
                    }
                },
                { upsert:true, session:dbSession }
            );

            // Commit transaction
            await dbSession.commitTransaction();
            dbSession.endSession();
            console.log(`Escrow auto released for order ${order._id}`);

            // Send notification to business profile for order completion
            await sendNotification({
                userId: escrow.sellerId.ownerUserId,
                title: "Order Completion!",
                content: "Order has been completed!",
                type: "BusinessProfile"
            });
        }
        catch(error)
        {
            await dbSession.abortTransaction();
            dbSession.endSession();
            console.log("Auto release failed:", error.message);
        }
    }
});