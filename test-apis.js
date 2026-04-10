"use strict";

const http = require("http");

const BASE = "http://localhost:4001";

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
      },
    };
    const url = new URL(path, BASE);
    opts.hostname = url.hostname;
    opts.port = url.port;
    opts.path = url.pathname;

    const req = http.request(opts, (res) => {
      let raw = "";
      res.on("data", (c) => (raw += c));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode, body: raw });
        }
      });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

function sep(title) {
  console.log("\n" + "═".repeat(60));
  console.log(`  ${title}`);
  console.log("═".repeat(60));
}

async function run() {
  // ── 1. POST /provider/add ──────────────────────────────────────
  sep("1 · POST /provider/add");
  const providerPayload = {
    providerId: "provider-test-001",
    name: "Spice Garden Kitchen",
    shortDesc: "Home-style Indian food delivery",
    city: "ONDC:std:city:Bangalore",
    bppId: "tsp.nearshop.in",
    bppUri: "http://onix-bpp:8082/bpp/receiver",
    catalogId: "catalog-spice-garden-001",
    catalogName: "Spice Garden Menu",
    validity: {
      startDate: "2025-01-01T00:00:00Z",
      endDate: "2025-12-31T23:59:59Z",
    },
    packingCharge: 20,
    deliveryCharge: 40,
    gstRate: 0.05,
    currency: "INR",
    serviceability: {
      maxDistance: 10,
      unit: "KM",
      timing: [
        {
          daysOfWeek: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
          timeRange: { start: "09:00", end: "22:00" },
        },
      ],
    },
    policies: {
      returns: { allowed: false },
      cancellation: {
        allowed: true,
        window: "PT1H",
        cutoffEvent: "BEFORE_PACKING",
      },
    },
    paymentConstraints: {
      codAvailable: true,
      paymentMethods: ["COD", "UPI", "PREPAID"],
    },
    isActive: true,
  };
  console.log("REQUEST:", JSON.stringify(providerPayload, null, 2));
  try {
    const r1 = await post("/provider/add", providerPayload);
    console.log(`\nRESPONSE  status=${r1.status}`);
    console.log(JSON.stringify(r1.body, null, 2));
    if (r1.body?.message?.ack?.status !== "ACK") {
      console.error("FAIL: expected ACK");
      process.exit(1);
    }
    console.log("PASS ✓");
  } catch (err) {
    console.error("FAIL (network):", err.message);
    process.exit(1);
  }

  // ── 2. POST /resources/add ─────────────────────────────────────
  sep("2 · POST /resources/add");
  const resourcePayload = {
    resourceId: "item-butter-chicken-001",
    offerId: "offer-butter-chicken-001",
    providerId: "provider-test-001",
    name: "Butter Chicken",
    shortDesc: "Tender chicken in a rich tomato-butter gravy",
    imageUri:
      "https://tourism-bpp-infra2.becknprotocol.io/attachments/view/butter-chicken.jpg",
    unitPrice: 280,
    currency: "INR",
    unitCode: "EA",
    resourceAttributes: {
      brand: "Spice Garden",
      originCountry: "IN",
      weight: {
        unitQuantity: 350,
        unitCode: "GRAM",
      },
      foodClassification: "NON_VEG",
      allergens: ["DAIRY", "GLUTEN"],
      cuisine: "North Indian",
      preparation: {
        instructions: "Heat and serve",
        storage: "Refrigerate below 4°C",
        shelfLife: "PT4H",
      },
    },
    offerAttributes: {
      policies: {
        returns: { allowed: false },
        cancellation: {
          allowed: true,
          window: "PT30M",
          cutoffEvent: "BEFORE_PACKING",
        },
        replacement: { allowed: false },
      },
      paymentConstraints: {
        codAvailable: true,
        paymentMethods: ["COD", "UPI"],
      },
      serviceability: {
        maxDistance: 8,
        unit: "KM",
        timing: [
          {
            daysOfWeek: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
            timeRange: { start: "11:00", end: "22:00" },
          },
        ],
      },
    },
    isActive: true,
    isPublished: false,
  };
  console.log("REQUEST:", JSON.stringify(resourcePayload, null, 2));
  try {
    const r2 = await post("/resources/add", resourcePayload);
    console.log(`\nRESPONSE  status=${r2.status}`);
    console.log(JSON.stringify(r2.body, null, 2));
    if (r2.body?.message?.ack?.status !== "ACK") {
      console.error("FAIL: expected ACK");
      process.exit(1);
    }
    console.log("PASS ✓");
  } catch (err) {
    console.error("FAIL (network):", err.message);
    process.exit(1);
  }

  // ── 3. POST /publish ───────────────────────────────────────────
  sep("3 · POST /publish");
  const publishPayload = { resourceIds: ["item-butter-chicken-001"] };
  console.log("REQUEST:", JSON.stringify(publishPayload, null, 2));
  try {
    const r3 = await post("/publish", publishPayload);
    console.log(`\nRESPONSE  status=${r3.status}`);
    console.log(JSON.stringify(r3.body, null, 2));
    if (r3.body?.message?.ack?.status !== "ACK") {
      console.error("FAIL: expected ACK");
      process.exit(1);
    }
    console.log("PASS ✓ (ACK received — callback fires after 2 s)");
  } catch (err) {
    console.error("FAIL (network):", err.message);
    process.exit(1);
  }

  sep("ALL TESTS PASSED");
}

run().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
