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
const { emptyList } = require("../constants");

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

// Fetch recent transactions
const fetchBusinessRecentTransactions = asyncHandler(async (request, response) => {
    // Get business profile ID
    const { businessProfileId } = request.user.profiles;

    // Query options
    const { page = 1, limit = 10 } = request.query;

    // Pagination options
    const options = {
        page: Number(page),
        limit: Number(limit),
        select:"orderId createdAt paymentMethod status amount -_id",
        lean: true,
        sort: { createdAt: -1 }
    };

    // Fetch
    const transactions = await Transaction.paginate({ ownerId:businessProfileId, ownerModel:"BusinessProfile" }, options);
    if(!transactions.docs?.length) return response.status(200).json(new ApiResponse(200, emptyList, "No transactions found for business profile"));

    // Response
    return response.status(200).json(new ApiResponse(200, transactions, "Recent transactions for business have been fetched"));
});

// Fetch financial performance for business
const fetchBusinessFinancialPerformance = asyncHandler(async (request, response) => {
    // Get business profile ID
    const { businessProfileId } = request.user.profiles;

    // Current date
    const now = new Date();

    // Calculate start of week (Monday)
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() + diff);
    startOfWeek.setHours(0,0,0,0);

    // End of week (Sunday)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23,59,59,999);

    // Aggregate weekly earnings
    const weeklyEarnings = await EscrowTransaction.aggregate([
        // Match
        {
            $match:{
                sellerId: convertToMongoId(businessProfileId),
                createdAt:{ $gte:startOfWeek, $lte:endOfWeek },
                status:"released"
            }
        },

        // Group by weekday
        {
            $group:{
                _id:{ $dayOfWeek:"$createdAt" },
                earning:{ $sum:"$netAmount" }
            }
        }
    ]);

    // Aggregate totals
    const totals = await EscrowTransaction.aggregate([
        // Match
        {
            $match:{
                sellerId: convertToMongoId(businessProfileId),
                status:"released"
            }
        },

        // Group
        {
            $group:{
                _id:null,
                totalEscrowVolume:{ $sum:"$totalAmount" },
                netEarning:{ $sum:"$netAmount" }
            }
        }
    ]);

    // Prepare weekly graph payload
    const weekMap = { 
        2:"monday", 3:"tuesday", 4:"wednesday", 5:"thursday",
        6:"friday", 7:"saturday", 1:"sunday" 
    };

    // Grapgh
    const graph = {
        monday:0, tuesday:0, wednesday:0, thursday:0,
        friday:0, saturday:0, sunday:0
    };

    // Weekly earnings
    weeklyEarnings.forEach(item => {
        const day = weekMap[item._id];
        if(day) graph[day] = item.earning;
    });

    // Prepare totals payload
    const payload = {
        graph,
        totalEscrowVolume: totals[0]?.totalEscrowVolume || 0,
        netEarning: totals[0]?.netEarning || 0
    };

    // Response
    return response.status(200).json(new ApiResponse(200, payload, "Business financial performance has been fetched"));
});

// Fetch business earnings
const fetchBusinessEarnings = asyncHandler(async (request, response) => {
    // Get business profile ID
    const { businessProfileId } = request.user.profiles;

    // Query options
    const { page = 1, limit = 10 } = request.query;

    // Pagination options
    const options = {
        page: Number(page),
        limit: Number(limit),
        select:"orderId createdAt totalAmount platformFee netAmount status -_id",
        lean: true,
        sort: { createdAt: -1 }
    };    

    // Fetch
    const escrow = await EscrowTransaction.paginate({ sellerId:businessProfileId }, options);
    if(!escrow.docs?.length) return response.status(200).json(new ApiResponse(200, emptyList, "No business earnings"));

    // Response
    return response.status(200).json(new ApiResponse(200, escrow, "Business earnings have been fetched"));    
});

module.exports = { fetchBusinessWalletAnalytics, fetchBusinessRecentTransactions, 
fetchBusinessFinancialPerformance, fetchBusinessEarnings };