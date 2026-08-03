const { Schema, model } = require("mongoose");
const paginate = require("mongoose-paginate-v2");
const aggregatePaginate = require("mongoose-aggregate-paginate-v2");

// Schema
const productSchema = new Schema({
    businessId: { type: Schema.Types.ObjectId, ref: "BusinessProfile" },
    title: { type:String, required:true },
    image: { type:String, required:true },
    groupImages: [{ type:String }],
    detail: { type:String, required:true },
    category: { type:String, required:true },
    pricePerUnit: { type:Number, required:true },
    tieredPricing: [{
        qty: { type:String, trim:true },
        price: { type:Number, min:0 }
    }],
    minOrderQty: { type:Number, required:true, default:1 },
    stockQty: { type:Number, required:true, default:0 },
    lowStockThreshold: { type:Number, default:5 }, // For critical stock alert
    shippingCost:{ type:Number, required:true, default:0 },
    estimatedDeliveryDays: { type:String, required:true },
    isFeatured: { type:Boolean, default:false },
    status: { type: String, enum:["pending", "approved", "rejected", "draft"], default: "pending" },
    isSingleProductAvailable: { type: Boolean, default:false },
    isFlashDeal: { type:Boolean, default:false },
    extras:{ type:String }, // 15% off or Free shipping something

    // Views
    viewedBy: [{ type:Schema.Types.ObjectId, ref:"User" }],
    viewsCount: { type:Number, default:0 },

    // Rejection
    rejection: {
      // Reference
      rejectedBy: { type: Schema.Types.ObjectId, ref: "Admin" },
      rejectedAt: { type: Date },

      // Details
      reason: { type: String, trim: true },
      note: { type: String, trim: true }
    }    
}, { timestamps: true });

// Inject plugin
productSchema.plugin(paginate);
productSchema.plugin(aggregatePaginate);

// Model
const Product = model("Product", productSchema);

module.exports = Product;