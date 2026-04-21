const cron = require("node-cron");
const mongoose = require("mongoose");
const Order = require("../models/orders");
const EscrowTransaction = require("../models/escrowTrasanction");
const Wallet = require("../models/walletModel");
const Dispute = require("../models/disputeModel");

// Auto release dispute escrow funds after 14 days of no seller response
cron.schedule("0 */12 * * *", async () => {
    console.log("Running auto dispute release job");

    // Calculate date (14 days ago)
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    // Find disputed orders
    const orders = await Order.find({ status: "disputed" });

    // If no orders found
    if(!orders.length) return console.log("No disputed orders found for auto release");

    // Process each order
    for(const orderData of orders)
    {
        // Start DB transaction
        const dbSession = await mongoose.startSession();
        dbSession.startTransaction();

        try
        {
            // Find each dispute record
            const disputedRecord = await Dispute.findOne({ orderId: orderData._id, sellerResponseStatus: false }).session(dbSession);

            // Skip if not found
            if(!disputedRecord)
            {
                await dbSession.abortTransaction();
                dbSession.endSession();
                continue;
            }

            // Check time condition
            if(new Date(disputedRecord.createdAt) > fourteenDaysAgo)
            {
                await dbSession.abortTransaction();
                dbSession.endSession();
                continue;
            }

            // Get escrow
            const escrow = await EscrowTransaction.findOne({ orderId: orderData._id }).session(dbSession);
            if(!escrow)
            {
                await dbSession.abortTransaction();
                dbSession.endSession();
                continue;
            }

            // Mark order status as completed
            await Order.findByIdAndUpdate(
                orderData._id, 
                { $set:{ status:"completed" } }, 
                { session:dbSession }
            );

            // Mark dispute status as resolved
            disputedRecord.status = "resolved"; 
            await disputedRecord.save({ session:dbSession });   
            
            // Mark escrow status as refunded
            escrow.status = "refunded";
            await escrow.save({ session:dbSession });            

            // Deduct from seller's wallet
            await Wallet.findOneAndUpdate(
                { ownerId: escrow.sellerId, ownerModel: "BusinessProfile" },
                { $inc:{ pendingBalance: -Number(escrow.netAmount) } },
            );

            // Full refund to buyer
            await Wallet.findOneAndUpdate(
                { ownerId: escrow.buyerId, ownerModel: "UserProfile" },
                { $inc:{ availableBalance: Number(escrow.totalAmount) } },
                { new:true, session:dbSession }
            );

            // Commit
            await dbSession.commitTransaction();
            dbSession.endSession();

            // Emit socket
            const io = request.app.get("io");  
            io.to(String(escrow.buyerId)).emit("update-dispute", { orderId: escrow.orderId });
            io.to(String(escrow.sellerId)).emit("update-dispute", { orderId: escrow.orderId });                         
            console.log(`Auto release completed for order ${orderData._id}`);
        }
        catch(error)
        {
            await dbSession.abortTransaction();
            dbSession.endSession();
            console.log("Auto release failed:", error.message);
        }
    }
});