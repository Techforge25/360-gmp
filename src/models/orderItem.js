const { Schema, model } = require("mongoose");

// Schema
const orderItemSchema = new Schema({
    orderId: { type: Schema.Types.ObjectId, ref: "Order" },
    productId: { type: Schema.Types.ObjectId, ref: "Product" },
    quantity: Number,
    pricePerUnit: Number,
    totalPrice: Number
});

// Model
const OrderItem = model("OrderItem", orderItemSchema);

module.exports = OrderItem;