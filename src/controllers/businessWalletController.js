const BusinessProfile = require("../models/businessProfileSchema");
const EscrowTransaction = require("../models/escrowTrasanction");
const Wallet = require("../models/walletModel");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const mongoose = require("mongoose");
const Stripe = require("stripe");
const validate = require("../utils/validate");
const withdrawFundsValidationSchema = require("../validations/withdrawFundValidator");
const UserProfile = require("../models/userProfile");
const Withdrawal = require("../models/withdrawalModel");
const User = require("../models/users");
const Transaction = require("../models/transactionModel");
const convertToMongoId = require("../utils/convertToMongoId");

// Fetch wallet analytics for business
const fetchBusinessWalletAnalytics = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Find Business
    const business = await BusinessProfile.findOne({ ownerUserId:userId }).select("_id").lean();
    if(!business) throw new ApiError(404, "Business profile not found");

    // Wallet
    const wallet = await Wallet.findOne({ ownerId:business._id, ownerModel:"BusinessProfile" }).lean();
    if(!wallet) throw new ApiError(400, "Wallet account not found");

    // Escrow Stats
    const [escrowStats] = await EscrowTransaction.aggregate([
        { $match: { sellerId:business._id } },
        {
            $group: {
                _id: null,

                // Total sales volume
                totalSalesVolume: {
                    $sum: {
                        $cond: [
                            { $ne: ["$status", "refunded"] },
                            "$totalAmount",
                            0
                        ]
                    }
                },

                // Total platform fee
                totalPlatformFees: {
                    $sum: {
                        $cond: [
                            { $ne: ["$status", "refunded"] },
                            "$platformFee",
                            0
                        ]
                    }
                },

                // Net earnings
                netEarnings: {
                    $sum: {
                        $cond: [
                            { $eq: ["$status", "released"] },
                            "$netAmount",
                            0
                        ]
                    }
                }
            }
        }
    ]);

    // Safe defaults
    const stats = escrowStats || { totalSalesVolume:0, totalPlatformFees:0, netEarnings:0 };

    // Final payload
    const payload = {
        availableBalance: wallet?.availableBalance ?? 0,
        pendingBalance: wallet?.pendingBalance ?? 0,
        totalSalesVolume: stats.totalSalesVolume,
        totalPlatformFees: stats.totalPlatformFees,
        netEarnings: stats.netEarnings
    };

    // Response
    return response.status(200).json(new ApiResponse(200, payload, "Wallet analytics for business fetched successfully"));
});

module.exports = { fetchBusinessWalletAnalytics };