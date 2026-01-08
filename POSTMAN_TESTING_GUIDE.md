# 360-GMP Orders & Escrow System - Postman Testing Guide

## 📋 Setup Instructions

### 1. Import Collection
1. Open Postman
2. Click **Import** button
3. Select file: `360-GMP_Order_Escrow_Collection.postman_collection.json`
4. Collection imported successfully!

### 2. Configure Variables
1. Click on collection name: **360-GMP Orders & Escrow System**
2. Go to **Variables** tab
3. Set `base_url` according to your server:
   - Local: `http://localhost:5000`
   - Production: `https://your-domain.com`

### 3. Environment Setup
Make sure your `.env` file has:
```env
STRIPE_SECRET_KEY=sk_test_... # Your Stripe test secret key
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000
PLATFORM_FEE_PERCENT=5  # Optional, default is 5%
```

---

## 🧪 Testing Flow

### **Step 1: Authentication**

#### 1.1 Create Buyer Account
- **Request**: `User Signup`
- **Body**: 
  ```json
  {
    "email": "buyer@test.com",
  "passwordHash": "test123"
  }
  ```
- **Expected**: Status 201

#### 1.2 Login as Buyer
- **Request**: `User Login (Buyer)`
- **Body**: Same as signup
- **Expected**: Status 200
- **Note**: Access token will be in cookie. Copy token and set in collection variable `access_token` if using Bearer auth

#### 1.3 Create Seller Account (Optional)
- Repeat signup/login with different email: `seller@test.com`
- Save token as `seller_access_token` variable

---

### **Step 2: Setup Products**

#### 2.1 Create Business Profile (Required for seller)
Before creating products, seller needs business profile:
- Use Business Profile endpoints to create profile
- Or check existing business profile

#### 2.2 Create Product
- **Request**: `Create Product` (requires seller login)
- **Headers**: Authorization: Bearer `{{seller_access_token}}`
- **Body**:
  ```json
  {
    "title": "Wireless Headphones",
    "detail": "High-quality wireless headphones",
    "category": "Electronics",
    "pricePerUnit": 5000,
    "minOrderQty": 1,
    "stockQty": 50,
    "leadTime": 3,
    "shippingTerms": "Standard Shipping",
    "isFeatured": false
  }
  ```
- **Expected**: Status 201
- **Note**: Product ID will be auto-saved in `product_id` variable

#### 2.3 Get All Products
- **Request**: `Get All Products`
- **Expected**: List of all products
- Use this to get product IDs if needed

---

### **Step 3: Orders Flow**

#### 3.1 Create Checkout Session
- **Request**: `Create Checkout Session`
- **Headers**: Authorization: Bearer `{{access_token}}` (buyer token)
- **Body**:
  ```json
  {
    "items": [
      {
        "productId": "{{product_id}}",
        "quantity": 2
      }
    ],
    "shippingAddress": "House #1, Street 2, Karachi, Pakistan"
  }
  ```
- **Expected**: Status 200
- **Response**: Contains `checkoutUrl` and `sessionId`
- **Note**: 
  - `checkoutUrl` is auto-saved
  - Copy `checkoutUrl` and open in browser

#### 3.2 Complete Payment on Stripe
1. Open `checkoutUrl` from previous response in browser
2. Use Stripe test card:
   - **Card Number**: `4242 4242 4242 4242`
   - **Expiry**: Any future date (e.g., `12/25`)
   - **CVC**: Any 3 digits (e.g., `123`)
   - **ZIP**: Any 5 digits (e.g., `12345`)
3. Click **Pay**
4. After success, you'll be redirected to success URL
5. **Copy the `session_id` from URL** (it will be in query params)

#### 3.3 Verify Payment & Create Order
- **Request**: `Verify Payment & Create Order`
- **Query**: `session_id={{checkout_session_id}}`
- **Expected**: Status 201
- **Response**: 
  - Order created
  - Escrow transaction created
  - Status: `"held"` (funds in escrow)
- **Note**: 
  - `order_id` is auto-saved
  - `escrow_transaction_id` is auto-saved

#### 3.4 Get User Orders
- **Request**: `Get User Orders`
- **Headers**: Authorization: Bearer `{{access_token}}`
- **Expected**: List of buyer's orders

#### 3.5 Get Order Details
- **Request**: `Get Order By ID`
- **Expected**: Order details with escrow status

#### 3.6 Update Order Status
- **Request**: `Update Order Status`
- **Body**:
  ```json
  {
    "orderStatus": "Shipped"
  }
  ```
- **Valid statuses**: `Pending`, `Processing`, `Confirmed`, `Shipped`, `Delivered`, `Cancelled`

---

### **Step 4: Escrow System**

#### 4.1 Create Stripe Connect Account (Seller)
- **Request**: `Create Stripe Connect Account`
- **Headers**: Authorization: Bearer `{{seller_access_token}}`
- **Expected**: Status 201/200
- **Response**: Contains `accountLink` (onboarding URL)
- **Note**: 
  - `accountLink` is auto-saved
  - Open this URL in browser to complete seller onboarding
  - Stripe test mode ke liye test data use karein

#### 4.2 Check Connect Account Status
- **Request**: `Check Connect Account Status`
- **Headers**: Authorization: Bearer `{{seller_access_token}}`
- **Expected**: Account status and capabilities
- **Note**: Check if `chargesEnabled` and `payoutsEnabled` are `true`

#### 4.3 Get Escrow Transaction
- **Request**: `Get Escrow Transaction`
- **Query**: `transaction_id={{escrow_transaction_id}}`
- **Expected**: Escrow transaction details with status `"held"`

#### 4.4 Release Escrow Funds (After Delivery)
- **Request**: `Release Escrow Funds to Seller`
- **Headers**: Authorization: Bearer `{{access_token}}`
- **Body**:
  ```json
  {
    "releaseNotes": "Order delivered successfully. Releasing escrow funds to seller."
  }
  ```
- **Expected**: Status 200
- **Response**: 
  - Funds transferred to seller
  - Platform fee deducted (default 5%)
  - Escrow status: `"released"`
  - Order status: `"Delivered"`
- **Note**: Seller ke paas Stripe Connect account setup hona chahiye

#### 4.5 Refund Escrow Funds (If Cancelled)
- **Request**: `Refund Escrow Funds to Buyer`
- **Headers**: Authorization: Bearer `{{access_token}}`
- **Body**:
  ```json
  {
    "refundReason": "Order cancelled by buyer"
  }
  ```
- **Expected**: Status 200
- **Response**: 
  - Full refund to buyer
  - Product stock restored
  - Escrow status: `"refunded"`
  - Order status: `"Cancelled"`

---

## 🔄 Complete Test Flow

### Happy Path:
1. ✅ Signup/Login as buyer
2. ✅ Signup/Login as seller
3. ✅ Create business profile (seller)
4. ✅ Create Stripe Connect account (seller)
5. ✅ Complete Connect onboarding
6. ✅ Create product (seller)
7. ✅ Create checkout session (buyer)
8. ✅ Complete payment on Stripe
9. ✅ Verify payment & create order
10. ✅ Check escrow status (should be "held")
11. ✅ Update order status to "Delivered"
12. ✅ Release escrow funds to seller
13. ✅ Verify funds released successfully

### Cancellation Path:
1. ✅ Create order (steps 1-9 above)
2. ✅ Refund escrow funds to buyer
3. ✅ Verify refund processed
4. ✅ Verify stock restored

---

## 🧪 Stripe Test Cards

For testing payments, use these Stripe test cards:

| Card Number | Description |
|------------|-------------|
| `4242 4242 4242 4242` | Success (Visa) |
| `4000 0000 0000 0002` | Card declined |
| `4000 0000 0000 9995` | Insufficient funds |

**Test Card Details:**
- **Expiry**: Any future date
- **CVC**: Any 3 digits
- **ZIP**: Any 5 digits

---

## 📝 Important Notes

1. **Authentication**: 
   - Token cookie mein aata hai by default
   - Agar Bearer token use karna hai, to login ke baad token copy karke `access_token` variable mein set karein

2. **Stripe Connect**:
   - Seller ko payment receive karne ke liye Connect account setup karna zaroori hai
   - Test mode mein onboarding quickly complete hoti hai

3. **Escrow Flow**:
   - Payment ke baad funds automatically escrow mein hold hote hain
   - Seller ko payment delivery confirm hone tak nahi milti
   - Platform fee (default 5%) automatic deduct hoti hai

4. **Environment Variables**:
   - Make sure `STRIPE_SECRET_KEY` test mode key hai
   - `PLATFORM_FEE_PERCENT` optional hai (default 5%)

5. **Error Handling**:
   - Agar product stock kam hai, error aayega
   - Agar seller ka Connect account setup nahi hai, release fund fail ho sakta hai

---

## 🐛 Troubleshooting

### Issue: "Unauthorized" Error
- **Solution**: Make sure you're logged in and token is set correctly
- Check if token is expired

### Issue: "Product not found"
- **Solution**: Make sure product is created and `product_id` variable is set

### Issue: "Seller has not set up Stripe Connect account"
- **Solution**: Complete Stripe Connect onboarding first

### Issue: "Insufficient stock"
- **Solution**: Check product `stockQty` and reduce quantity

### Issue: "Payment not completed"
- **Solution**: Make sure payment is completed on Stripe checkout page
- Check `session_id` is correct

---

## 📞 Support

Agar koi issue aaye to check karein:
1. Server logs
2. Stripe Dashboard (test mode)
3. Database (MongoDB) - orders and escrow transactions

**Happy Testing! 🚀**
