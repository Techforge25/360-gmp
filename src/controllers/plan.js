const Plan = require("../models/plan");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");

// Save plan
const savePlan = asyncHandler(async (request, response) => {
    const { name, durationDays, price } = request.body;
    if(!name) throw new ApiError(400, "Please select plan");

    let allowsUserAccess = true;
    let allowsBusinessAccess = true;
    if(name === "TRIAL") allowsBusinessAccess = false;

    // Create plan
    const plan = await Plan.create({ 
        name, 
        allowsUserAccess, 
        allowsBusinessAccess, 
        durationDays:Number(durationDays),
        price:Number(price)
    });

    if(!plan) throw new ApiError(500, "Failed to save a plan");
    return response.status(201).json(new ApiResponse(201, { plan:name }, "Plan has been created successfully"));
});

// Fetch plans
const fetchAllPlans = asyncHandler(async (request, response) => {
    const plans = await Plan.find({}).select("-__v");
    return response.status(200).json(new ApiResponse(200, plans, "Plans have been fetched"));
});

module.exports = { savePlan, fetchAllPlans };