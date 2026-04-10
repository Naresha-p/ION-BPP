"use strict";

const mongoose = require("mongoose");

const MONGO_URI = "mongodb://ondcMongo:OndcMongo123@10.10.10.56:27017/";

mongoose.connection.on("connected", () =>
  console.log("[mongodb] connected to ION-bpp"),
);
mongoose.connection.on("error", (err) =>
  console.error("[mongodb] connection error:", err.message),
);

async function connectDB() {
  await mongoose.connect(MONGO_URI, { dbName: "ION-bpp" });
}

// Schema — stores the full raw catalog publish request as-is
const catalogPublishSchema = new mongoose.Schema(
  {
    context: { type: mongoose.Schema.Types.Mixed },
    message: { type: mongoose.Schema.Types.Mixed },
  },
  {
    strict: false, // allow any extra fields in the payload
    timestamps: true, // adds createdAt / updatedAt
    collection: "catalog_publishes",
  },
);

// type
// {
// _id:ObjectId,
// context:Object,
// message:Object, // this is simmiler as catalog.message from static/publish/publish-request.json
// createdAt:Date,
// updatedAt:Date
// }

const CatalogPublish = mongoose.model("CatalogPublish", catalogPublishSchema);

// Schema — stores confirmed orders
// { orderId: String, data: Object (full on_confirm payload) }
const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true },
    transactionId: { type: String },
    data: { type: mongoose.Schema.Types.Mixed, required: true },
    status: { type: String, default: "CONFIRMED" },
  },
  {
    timestamps: true,
    collection: "orders",
  },
);

const Order = mongoose.model("Order", orderSchema);

// Schema — stores catalog items (resources)
// Fields reused across the full transaction lifecycle (select → confirm → status)
const resourceSchema = new mongoose.Schema(
  {
    resourceId: { type: String, required: true, unique: true },
    offerId: { type: String, required: true },
    providerId: { type: String, required: true },

    name: { type: String, required: true },
    shortDesc: { type: String, required: true },
    imageUri: { type: String },

    unitPrice: { type: Number, required: true },
    currency: { type: String, required: true, default: "INR" },
    unitCode: { type: String, required: true, default: "EA" },

    resourceAttributes: {
      brand: { type: String, required: true },
      originCountry: { type: String, required: true },
      weight: {
        unitQuantity: { type: Number, required: true },
        unitCode: { type: String, required: true }, // e.g. "GRAM"
      },
      foodClassification: { type: String, required: true }, // VEG | NON_VEG | EGG
      allergens: [{ type: String }],
      cuisine: { type: String, required: true },
      preparation: {
        instructions: { type: String, required: true },
        storage: { type: String },
        shelfLife: { type: String }, // ISO 8601 duration e.g. "PT30M"
      },
    },

    offerAttributes: {
      policies: {
        returns: {
          allowed: { type: Boolean, default: false },
          window: { type: String }, // ISO 8601 duration e.g. "P1D"
          method: { type: String }, // e.g. "SELLER_PICKUP"
        },
        cancellation: {
          allowed: { type: Boolean, default: false },
          window: { type: String },
          cutoffEvent: { type: String }, // e.g. "BEFORE_PACKING"
        },
        replacement: {
          allowed: { type: Boolean, default: false },
          window: { type: String },
          method: { type: String },
        },
      },
      paymentConstraints: {
        codAvailable: { type: Boolean, default: false },
        paymentMethods: [{ type: String }], // e.g. ["PREPAID", "COD", "UPI"]
      },
      serviceability: {
        maxDistance: { type: Number },
        unit: { type: String, default: "KM" },
        timing: [
          {
            daysOfWeek: [{ type: String }], // e.g. ["MON", "TUE", ...]
            timeRange: {
              start: { type: String }, // "HH:MM"
              end: { type: String },
            },
          },
        ],
      },
      timeRange: {
        start: { type: String },
        end: { type: String },
      },
      holidays: [{ type: String }], // ISO date strings e.g. "2026-01-26"
    },

    isActive: { type: Boolean, required: true, default: true },
    isPublished: { type: Boolean, required: true, default: false },
  },
  {
    timestamps: true,
    collection: "resources",
  },
);

const Resource = mongoose.model("Resource", resourceSchema);

// Schema — stores publisher (store/provider) details
const providerSchema = new mongoose.Schema(
  {
    // Identity
    providerId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    shortDesc: { type: String, required: true },
    city: { type: String, required: true }, // e.g. "ONDC:std:city:Mumbai"
    bppId: { type: String, required: true },
    bppUri: { type: String, required: true },

    // Catalog
    catalogId: { type: String, required: true },
    catalogName: { type: String, required: true },
    validity: {
      startDate: { type: String, required: true }, // ISO 8601
      endDate: { type: String, required: true },
    },

    // Pricing config (used in /select to calculate totals)
    packingCharge: { type: Number, required: true, default: 0 },
    deliveryCharge: { type: Number, required: true, default: 0 },
    gstRate: { type: Number, required: true, default: 0 }, // e.g. 0.05 for 5%
    currency: { type: String, required: true, default: "INR" },

    // Store-wide offer defaults (applied to all items)
    serviceability: {
      maxDistance: { type: Number, required: true },
      unit: { type: String, default: "KM" },
      timing: [
        {
          daysOfWeek: [{ type: String }], // e.g. ["MON", "TUE", ...]
          timeRange: {
            start: { type: String }, // "HH:MM"
            end: { type: String },
          },
        },
      ],
    },
    timeRange: {
      start: { type: String },
      end: { type: String },
    },
    holidays: [{ type: String }], // ISO date strings e.g. "2026-01-26"

    policies: {
      returns: {
        allowed: { type: Boolean, default: false },
        window: { type: String }, // ISO 8601 duration e.g. "P1D"
        method: { type: String }, // e.g. "SELLER_PICKUP"
      },
      cancellation: {
        allowed: { type: Boolean, default: false },
        window: { type: String },
        cutoffEvent: { type: String }, // e.g. "BEFORE_PACKING"
      },
    },
    paymentConstraints: {
      codAvailable: { type: Boolean, default: false },
      paymentMethods: [{ type: String }], // e.g. ["PREPAID", "COD", "UPI"]
    },

    isActive: { type: Boolean, required: true, default: true },
  },
  {
    timestamps: true,
    collection: "providers",
  },
);

const Provider = mongoose.model("Provider", providerSchema);

module.exports = { connectDB, CatalogPublish, Order, Resource, Provider };
