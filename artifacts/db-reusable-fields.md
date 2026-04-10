# DB Fields — Stored at Publish, Reused Across Full Transaction

These fields are set once during `catalog/publish` and looked up by the BPP
during every subsequent action (select → init → confirm → status → track).
Storing them in DB avoids hardcoding and makes the catalog dynamic.

---

## Resource (Item) — store per item

| Field | DB Key | Used In | Notes |
|---|---|---|---|
| Item ID | `resourceId` | select, init, confirm | primary lookup key |
| Item name | `name` | select, on_select, confirm | shown in commitment descriptor |
| Short description | `shortDesc` | select, discover | shown in search results |
| Image URL | `imageUri` | discover, select | product image |
| Brand | `brand` | select, on_select | inside resourceAttributes.identity |
| Origin country | `originCountry` | select, on_select | inside resourceAttributes.identity |
| Weight value + unit | `weight.value`, `weight.unitCode` | select, on_select | inside resourceAttributes.physical |
| Food classification | `foodClassification` | select, discover | VEG / NON_VEG / EGG |
| Allergens | `allergens[]` | select, discover | array of strings |
| Cuisine | `cuisine` | select, discover | e.g. "Italian" |
| Preparation instructions | `preparation.instructions` | select, on_select | recipe/cooking detail |
| Storage instructions | `preparation.storage` | select, on_select | optional |
| Shelf life | `preparation.shelfLife` | select, on_select | ISO 8601 duration |
| **Unit price** | `unitPrice` | **select → price calculation** | multiplied by qty to get line price |
| Currency | `currency` | select, init, confirm | e.g. "INR" |
| Unit code | `unitCode` | select, confirm | e.g. "EA" |

---

## Offer — store per item (1:1 with resource)

| Field | DB Key | Used In | Notes |
|---|---|---|---|
| Offer ID | `offerId` | select, init, confirm | links commitment to offer |
| Return policy | `policies.returns` | select, on_select, confirm | `{ allowed, window, method }` |
| Cancellation policy | `policies.cancellation` | select, on_select, confirm | `{ allowed, window, cutoffEvent }` |
| Replacement policy | `policies.replacement` | select, on_select | `{ allowed, window, method }` |
| COD available | `paymentConstraints.codAvailable` | select, init | bool |
| Payment methods | `paymentConstraints.paymentMethods[]` | select → consideration | e.g. `["PREPAID", "COD", "UPI"]` |
| Serviceability distance | `serviceability.maxDistance` + `unit` | select | filter buyers by distance |
| Operating days + hours | `serviceability.timing[]` | select | `{ daysOfWeek, timeRange }` |
| Holidays | `holidays[]` | select | dates store is closed |
| Top-level timeRange | `timeRange` | select | `{ start, end }` |

---

## Provider — store once (store-level)

| Field | DB Key | Used In | Notes |
|---|---|---|---|
| Provider ID | `providerId` | all actions | links all resources to seller |
| Provider name | `providerName` | all actions | shown in participant descriptor |
| Provider short desc | `providerShortDesc` | discover, select | store description |

---

## How These Map to the Transaction Flow

```
catalog/publish  →  DB stores resource + offer + provider
                         ↓
/select          →  lookup resource by ID → build commitment + consideration (unitPrice × qty)
                         ↓
/init            →  lookup offer policies → echo back in contract
                         ↓
/confirm         →  lookup offer → mark ACTIVE, set orderId, store order
                         ↓
/status, /track  →  lookup order by orderId → return current state
```

---

## Suggested MongoDB Document Shape (per catalog item)

```json
{
  "_id": "resource:sarpinos:margherita:001",
  "resourceId": "resource:sarpinos:margherita:001",
  "offerId": "offer:sarpinos:margherita:001",
  "providerId": "provider:sarpinos:bandra:001",

  "name": "Margherita Pizza",
  "shortDesc": "Classic margherita with fresh mozzarella",
  "imageUri": "https://...",

  "unitPrice": 289,
  "currency": "INR",
  "unitCode": "EA",

  "resourceAttributes": {
    "brand": "Sarpino's Pizzeria",
    "originCountry": "IN",
    "weight": { "unitQuantity": 350, "unitCode": "GRAM" },
    "foodClassification": "VEG",
    "allergens": ["GLUTEN", "DAIRY"],
    "cuisine": "Italian",
    "preparation": {
      "instructions": "Wood-fired thin-crust...",
      "storage": "Serve immediately while hot",
      "shelfLife": "PT30M"
    }
  },

  "offerAttributes": {
    "policies": {
      "returns":       { "allowed": true,  "window": "P1D",  "method": "SELLER_PICKUP" },
      "cancellation":  { "allowed": true,  "window": "PT30M", "cutoffEvent": "BEFORE_PACKING" },
      "replacement":   { "allowed": false }
    },
    "paymentConstraints": {
      "codAvailable": true,
      "paymentMethods": ["PREPAID", "COD", "UPI"]
    },
    "serviceability": {
      "maxDistance": 5,
      "unit": "KM",
      "timing": [{ "daysOfWeek": ["MON","TUE","WED","THU","FRI","SAT","SUN"], "timeRange": { "start": "10:00", "end": "23:00" } }]
    },
    "timeRange": { "start": "10:00", "end": "23:00" },
    "holidays": []
  }
}
```
