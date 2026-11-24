// Contract every courier provider must satisfy. Order, checkout and fulfilment code only talks to
// courierService.js, which talks to a provider through these methods - so a provider can be swapped
// (COURIER_PROVIDER=mock | shiprocket) without touching order logic.
//
// All methods are async. Normal business outcomes (not serviceable, etc.) are returned as data;
// CourierProviderError is thrown only for configuration or transport failures.

export const PROVIDER_METHODS = [
  'checkServiceability', // ({pickupPincode, deliveryPincode, weightKg, length, breadth, height, paymentMethod, codAmount}) -> {serviceable, couriers[], rejectionReason, chargeableWeightKg}
  'createShipment',      // ({referenceId, courierId, ...}) -> {ok, providerOrderId, providerShipmentId, awb, courierName, trackingUrl}
  'generateLabel',       // ({awb, providerShipmentId}) -> {ok, labelUrl | labelText}
  'schedulePickup',      // ({providerShipmentId, pickupDate}) -> {ok, pickupReference, scheduledAt}
  'getTracking',         // ({awb}) -> {ok, events[]}
];

export class CourierProviderError extends Error {
  constructor(message, code = 'PROVIDER_ERROR') {
    super(message);
    this.name = 'CourierProviderError';
    this.code = code;
  }
}

/** Throws if an object does not implement the provider contract. */
export const assertProvider = (p) => {
  if (!p || typeof p.name !== 'string') throw new CourierProviderError('Provider has no name', 'INVALID_PROVIDER');
  for (const m of PROVIDER_METHODS) {
    if (typeof p[m] !== 'function') throw new CourierProviderError(`Provider ${p.name} is missing ${m}()`, 'INVALID_PROVIDER');
  }
  return p;
};

// Shipment lifecycle shared by every provider (providers map their own codes onto these).
export const SHIPMENT_STATUSES = [
  'NOT_CREATED', 'CREATING', 'CREATED', 'PICKUP_SCHEDULED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY',
  'DELIVERED', 'FAILED_DELIVERY', 'RTO_INITIATED', 'RTO_IN_TRANSIT', 'RTO_DELIVERED', 'CANCELLED',
];
