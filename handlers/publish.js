"use strict";

const { randomUUID } = require("crypto");
const { Resource, Provider, CatalogPublish } = require("../db");
const { generateContext } = require("../heandler/functions/generateContext");

const RESOURCE_CTX =
  "https://raw.githubusercontent.com/beckn/local-retail/refs/heads/main/schema/RetailResource/v2.1/context.jsonld";
const OFFER_CTX =
  "https://raw.githubusercontent.com/beckn/local-retail/refs/heads/main/schema/RetailOffer/v2.1/context.jsonld";

// ---------------------------------------------------------------------------
// buildPublishPayload
//   Assembles the catalog/publish payload from DB documents.
// ---------------------------------------------------------------------------
function buildPublishPayload(provider, resources) {
  const context = generateContext(
    provider.bppId,
    provider.bppUri,
    provider.bppId,
    provider.bppUri,
    "catalog/publish",
    randomUUID(),
    randomUUID(),
  );

  const catalogResources = resources.map((r) => {
    const entry = {
      id: r.resourceId,
      descriptor: {
        name: r.name,
        shortDesc: r.shortDesc,
      },
      resourceAttributes: {
        "@context": RESOURCE_CTX,
        "@type": "RetailResource",
        identity: {
          brand: r.resourceAttributes.brand,
          originCountry: r.resourceAttributes.originCountry,
        },
        physical: {
          weight: {
            value: r.resourceAttributes.weight?.unitQuantity,
            unit: r.resourceAttributes.weight?.unitCode === "GRAM" ? "G" : r.resourceAttributes.weight?.unitCode,
          },
        },
      },
    };

    if (r.imageUri) {
      entry.descriptor.mediaFile = [
        { label: "Product Image", mimeType: "image/jpeg", uri: r.imageUri },
      ];
    }

    return entry;
  });

  const catalogOffers = resources.map((r) => ({
    id: r.offerId,
    descriptor: { name: r.name },
    resourceIds: [r.resourceId],
    provider: {
      id: provider.providerId,
      descriptor: { name: provider.name },
    },
    validity: provider.validity,
    offerAttributes: {
      "@context": OFFER_CTX,
      "@type": "RetailOffer",
      policies: {
        // item-level policy takes priority; falls back to store-wide policy
        returns:
          r.offerAttributes?.policies?.returns ?? provider.policies?.returns,
        cancellation:
          r.offerAttributes?.policies?.cancellation ??
          provider.policies?.cancellation,
        replacement: r.offerAttributes?.policies?.replacement,
      },
      paymentConstraints: {
        codAvailable:
          r.offerAttributes?.paymentConstraints?.codAvailable ??
          provider.paymentConstraints?.codAvailable,
      },
      serviceability: {
        distanceConstraint: {
          maxDistance:
            r.offerAttributes?.serviceability?.maxDistance ??
            provider.serviceability?.maxDistance,
          unit:
            r.offerAttributes?.serviceability?.unit ??
            provider.serviceability?.unit ??
            "KM",
        },
        timing:
          r.offerAttributes?.serviceability?.timing ??
          provider.serviceability?.timing,
      },
      timeRange: r.offerAttributes?.timeRange ?? provider.timeRange,
      holidays: r.offerAttributes?.holidays ?? provider.holidays,
    },
  }));

  const payload = {
    context,
    message: {
      catalogs: [
        {
          id: provider.catalogId,
          bppId: provider.bppId,
          bppUri: provider.bppUri,
          descriptor: {
            name: provider.catalogName,
            shortDesc: provider.shortDesc,
          },
          provider: {
            id: provider.providerId,
            descriptor: { name: provider.name },
          },
          validity: provider.validity,
          resources: catalogResources,
          offers: catalogOffers,
        },
      ],
    },
  };

  return payload;
}

// ---------------------------------------------------------------------------
// handlePublish
//   Input:  { resourceIds: string[], callbackUrl?: string }
//   Steps:
//     1. Fetch all resources from DB
//     2. Fetch provider using providerId from first resource
//     3. Build catalog/publish payload
//     4. Save to catalog_publishes
//     5. POST to callbackUrl
//   Returns: { success, payload } or throws
// ---------------------------------------------------------------------------
async function handlePublish(resourceIds, callbackUrl) {
  // 1. Fetch resources
  const resources = await Resource.find({
    resourceId: { $in: resourceIds },
  }).lean();

  const missing = resourceIds.filter(
    (id) => !resources.some((r) => r.resourceId === id),
  );
  if (missing.length > 0) {
    throw new Error(`Resources not found: ${missing.join(", ")}`);
  }

  // 2. Fetch provider (all resources must belong to same provider)
  const providerId = resources[0].providerId;
  const provider = await Provider.findOne({ providerId }).lean();
  if (!provider) {
    throw new Error(`Provider not found: providerId=${providerId}`);
  }

  // 3. Build payload
  const payload = buildPublishPayload(provider, resources);

  // 4. Save to catalog_publishes
  await CatalogPublish.create(payload);

  // 5. Mark resources as published
  await Resource.updateMany(
    { resourceId: { $in: resourceIds } },
    { $set: { isPublished: true } },
  );

  // 6. POST to callback — failure here is non-fatal; payload is already persisted
  try {
    const axios = require("axios");
    console.log(
      `[publish] callback → ${callbackUrl} payload: ${JSON.stringify(payload)}`,
    );
    const resp = await axios.post(callbackUrl, payload, {
      headers: { "Content-Type": "application/json" },
      timeout: 15000,
    });
    console.log(`[publish] callback → status=${resp.status}`);
  } catch (err) {
    const status = err.response?.status;
    const body = err.response?.data
      ? JSON.stringify(err.response.data).slice(0, 200)
      : err.message;
    console.error(
      `[publish] callback failed (non-fatal): url=${callbackUrl} status=${status ?? "CONN_ERR"} ${body}`,
    );
  }

  return payload;
}

module.exports = { handlePublish };
