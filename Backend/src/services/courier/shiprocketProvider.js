import { CourierProviderError } from './courierProvider.interface.js';

// Placeholder for the real Shiprocket integration. It deliberately makes NO network calls and reads NO
// credentials: every method reports that the provider is not connected. When real credentials and the API
// integration exist, implement these methods against the same contract (see courierProvider.interface.js).
const notConnected = async () => {
  throw new CourierProviderError('Shiprocket is not connected. Real courier integration has not been activated.', 'PROVIDER_NOT_CONFIGURED');
};

export const shiprocketProvider = {
  name: 'shiprocket',
  simulated: false,
  isConfigured: () => false,
  checkServiceability: notConnected,
  createShipment: notConnected,
  generateLabel: notConnected,
  schedulePickup: notConnected,
  getTracking: notConnected,
};

export default shiprocketProvider;
