"use strict";

const http = require("http");
const fs = require("fs");

const OUT = __dirname + "/test-resource-add-out.txt";
const lines = [];

function log(...args) {
  const line = args.join(" ");
  console.log(line);
  lines.push(line);
}

function save() {
  fs.writeFileSync(OUT, lines.join("\n") + "\n");
}

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(
      {
        hostname: "localhost",
        port: 4001,
        path,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
        },
      },
      (res) => {
        let raw = "";
        res.on("data", (c) => (raw += c));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(raw) });
          } catch {
            resolve({ status: res.statusCode, body: raw });
          }
        });
      },
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function run() {
  log("=== POST /resources/add ===");

  const payload = {
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
      weight: { unitQuantity: 350, unitCode: "GRAM" },
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
        cancellation: { allowed: true, window: "PT30M", cutoffEvent: "BEFORE_PACKING" },
        replacement: { allowed: false },
      },
      paymentConstraints: { codAvailable: true, paymentMethods: ["COD", "UPI"] },
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

  log("REQUEST:", JSON.stringify(payload, null, 2));

  try {
    const r = await post("/resources/add", payload);
    log("\nRESPONSE status=" + r.status);
    log(JSON.stringify(r.body, null, 2));

    if (r.status === 201 && r.body?.message?.ack?.status === "ACK") {
      log("\nPASS - resourceId=" + r.body.resourceId);
    } else {
      log("\nFAIL - unexpected response");
    }
  } catch (err) {
    log("\nNETWORK ERROR:", err.message);
    log("Is the server running on port 4001?");
  }

  save();
  log("\nResults saved to:", OUT);
}

run();
