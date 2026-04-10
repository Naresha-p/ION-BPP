# Publish Item — Field Reference

Source: `static/publish/publish-request.json` + `catalog.js` (FnB schema) + `static/select/on_select-response.json` (cross-verified)

---

## 1. Common — Set Once Per Provider / Catalog

These do NOT need to be collected per item. Hardcode or pull from deployment config.

| Field | Path | Value / Notes |
|---|---|---|
| Protocol version | `context.version` | `"2.0.0"` — static |
| Action | `context.action` | `"catalog/publish"` — static |
| Timestamp | `context.timestamp` | auto-generated (ISO 8601) |
| Message ID | `context.messageId` | auto-generated (UUID) |
| Transaction ID | `context.transactionId` | auto-generated or system-assigned |
| BAP ID | `context.bapId` | deployment config |
| BAP URI | `context.bapUri` | deployment config |
| BPP ID | `context.bppId` | deployment config |
| BPP URI | `context.bppUri` | deployment config |
| TTL | `context.ttl` | `"PT30S"` — static |
| Network ID | `context.networkId` | e.g. `"beckn.one/testnet"` — static |
| Catalog BPP ID | `message.catalogs[].bppId` | same as `context.bppId` |
| Catalog BPP URI | `message.catalogs[].bppUri` | same as `context.bppUri` |
| Catalog name | `message.catalogs[].descriptor.name` | store/catalog name, set once |
| Catalog short desc | `message.catalogs[].descriptor.shortDesc` | set once |
| Provider ID | `message.catalogs[].provider.id` | seller's fixed ID |
| Provider name | `message.catalogs[].provider.descriptor.name` | seller's display name |
| Catalog validity start | `message.catalogs[].validity.startDate` | set once (ISO 8601) |
| Catalog validity end | `message.catalogs[].validity.endDate` | set once (ISO 8601) |
| Offer provider | `offers[].provider` | copy from catalog provider |
| Offer validity | `offers[].validity` | copy from catalog validity |
| Serviceability distance | `offerAttributes.serviceability.distanceConstraint` | store-wide (e.g. 15 KM) |
| Serviceability timing | `offerAttributes.serviceability.timing[]` | store-wide days + hours |
| Return policy | `offerAttributes.policies.returns` | store-wide policy |
| Cancellation policy | `offerAttributes.policies.cancellation` | store-wide policy |
| COD available | `offerAttributes.paymentConstraints.codAvailable` | store-wide (bool) |
| Supported payment methods | `offerAttributes.paymentConstraints.paymentMethods[]` | store-wide list e.g. `["PREPAID", "COD", "UPI"]` — seen in on_select consideration |
| Operating hours (top-level) | `offerAttributes.timeRange` | redundant with serviceability.timing but present in on_select e.g. `{ start: "09:00", end: "21:00" }` |
| Holidays | `offerAttributes.holidays[]` | dates when store is closed e.g. `["2026-01-26", "2026-08-15"]` — seen in on_select |

---

## 2. Per Item — Collect for Every Item

### 2a. Resource — General (from publish-request.json · RetailResource schema)

| Field | Path in resource | Required | Example |
|---|---|---|---|
| Item ID | `id` | YES | `"item-flask-001"` (auto-generate OK) |
| Item name | `descriptor.name` | YES | `"Isothermal Flask MH500 Yellow"` |
| Short description | `descriptor.shortDesc` | YES | `"Double walled vacuum insulated flask, 500ml"` |
| Image URL | `descriptor.mediaFile[].uri` | optional | `"https://..."` |
| Image MIME type | `descriptor.mediaFile[].mimeType` | optional | `"image/jpeg"` |
| Image label | `descriptor.mediaFile[].label` | optional | `"Product Image"` |
| Brand | `resourceAttributes.identity.brand` | YES | `"InstaCuppa"` |
| Origin country | `resourceAttributes.identity.originCountry` | YES | `"IN"` |
| Weight value | `resourceAttributes.physical.weight.value` | YES | `350` |
| Weight unit | `resourceAttributes.physical.weight.unit` | YES | `"G"` (G / KG) |
| Volume value | `resourceAttributes.physical.volume.value` | optional | `500` |
| Volume unit | `resourceAttributes.physical.volume.unit` | optional | `"ML"` (ML / L) |
| Dimension unit | `resourceAttributes.physical.dimensions.unit` | optional | `"CM"` |
| Length | `resourceAttributes.physical.dimensions.length` | optional | `25` |
| Breadth | `resourceAttributes.physical.dimensions.breadth` | optional | `7` |
| Height | `resourceAttributes.physical.dimensions.height` | optional | `7` |
| Color | `resourceAttributes.physical.appearance.color` | optional | `"Yellow"` |
| Material | `resourceAttributes.physical.appearance.material` | optional | `"Stainless Steel"` |
| Finish | `resourceAttributes.physical.appearance.finish` | optional | `"Matte"` |
| Manufacturer/Packer type | `packagedGoodsDeclaration.manufacturerOrPacker.type` | YES | `"MANUFACTURER"` or `"PACKER"` |
| Manufacturer name | `packagedGoodsDeclaration.manufacturerOrPacker.name` | YES | `"InstaCuppa India Pvt Ltd"` |
| Manufacturer address | `packagedGoodsDeclaration.manufacturerOrPacker.address` | YES | `"Bangalore, Karnataka, IN"` |
| Common/generic name | `packagedGoodsDeclaration.commonOrGenericName` | YES | `"Stainless Steel Vacuum Flask"` |
| Net quantity value | `packagedGoodsDeclaration.netQuantity.value` | optional | `500` |
| Net quantity unit | `packagedGoodsDeclaration.netQuantity.unit` | optional | `"ML"` |

> `resourceAttributes.@context` and `@type` are **static** — set to RetailResource schema URL.

---

### 2b. Resource — FnB Specific (from catalog.js · FoodAndBeverageResourceAttributes schema)

Used in this app instead of the generic RetailResource above.

| Field | Path in resourceAttributes | Required | Example |
|---|---|---|---|
| Brand | `identity.brand` | YES | `"Sarpino's Pizzeria"` |
| Origin country | `identity.originCountry` | YES | `"IN"` |
| Weight value | `physical.weight.unitQuantity` | YES | `350` |
| Weight unit | `physical.weight.unitCode` | YES | `"GRAM"` |
| Food classification | `food.classification` | YES | `"VEG"` or `"NON_VEG"` or `"EGG"` |
| Allergens | `allergens[]` | YES | `["GLUTEN", "DAIRY"]` |
| Cuisine | `cuisine` | YES | `"Italian"` |
| Preparation instructions | `preparation.instructions` | YES | cooking/recipe description |
| Storage instructions | `preparation.storage` | optional | `"Serve immediately while hot"` |
| Shelf life | `preparation.shelfLife` | optional | `"PT30M"` (ISO 8601 duration) |
| Item unit price | *(top-level in catalog.js)* `unitPrice` | YES | `289` |
| Currency | *(top-level)* `currency` | YES | `"INR"` |
| Unit code | *(top-level)* `unitCode` | YES | `"EA"` (each) |

> `resourceAttributes.@context` → `https://schema.beckn.io/FoodAndBeverageResource/v2.1/context.jsonld`
> `resourceAttributes.@type` → `fnbr:FoodAndBeverageResourceAttributes`
> Both are **static** — do not collect from user.

---

### 2c. Offer — Per Item

Most fields are auto-derived. Only `replacement` policy may differ per item.

| Field | Path | Required | Notes |
|---|---|---|---|
| Offer ID | `offers[].id` | YES | auto-generate from resource ID |
| Offer name | `offers[].descriptor.name` | YES | copy from resource name |
| Linked resource IDs | `offers[].resourceIds[]` | YES | auto-link to resource ID |
| Replacement allowed | `offerAttributes.policies.replacement.allowed` | optional | item-specific; defaults to store policy |
| Replacement window | `offerAttributes.policies.replacement.window` | optional | e.g. `"P7D"` |
| Replacement method | `offerAttributes.policies.replacement.method` | optional | e.g. `"SELLER_PICKUP"` |
| Subject to availability | `offerAttributes.policies.replacement.subjectToAvailability` | optional | bool |

---

## 3. Minimum Fields to Collect Per FnB Item

Absolute minimum to publish one food item (everything else is static or auto-generated):

1. Name
2. Short description
3. Image URL *(strongly recommended)*
4. Food classification (`VEG` / `NON_VEG` / `EGG`)
5. Allergens list
6. Cuisine type
7. Preparation instructions
8. Weight (value + unit)
9. Unit price + currency
10. Storage instructions *(optional)*
11. Shelf life *(optional)*

---

## 4. Cross-Verification Notes (vs on_select-response.json)

Fields visible in `on_select` that are **NOT publish-time** — generated during transaction flow:

| Field | Where in on_select | Why excluded |
|---|---|---|
| `participants[]` | contract | formed at select time from buyer + provider |
| `commitmentAttributes.lineId` | commitment | generated per order line |
| `commitmentAttributes.quantity` | commitment | buyer sets at select |
| `commitmentAttributes.price` | commitment | unit price × qty, calculated at select |
| `commitmentAttributes.specialInstructions` | commitment | buyer-provided at select |
| `consideration.totalAmount` | consideration | calculated at select |
| `consideration.breakup[]` | consideration | calculated at select |
| `performance.deliveryDetails` | performance | buyer provides at init/confirm |

**3 fields added to artifact after cross-check (were missing):**
1. `offerAttributes.paymentMethods[]` — full list of accepted payment methods
2. `offerAttributes.timeRange` — top-level operating hours (alongside serviceability.timing)
3. `offerAttributes.holidays[]` — dates when store is closed
