import type { GeospatialResponse } from '../types/api';

export const GOLDEN_DEMO_GEOSPATIAL: GeospatialResponse = {
  farm: {
    farm_id: 1,
    farm_name: 'Green Field Farm',
    latitude: 12.9716,
    longitude: 77.5946,
  },
  nearby_markets: [
    {
      market_name: 'Kurnool Market',
      latitude: 13.0116,
      longitude: 77.6246,
      distance_km: 12.5,
      current_price: 6200,
      price_unit: 'Quintal',
    },
    {
      market_name: 'Yemmiganur Market',
      latitude: 12.9416,
      longitude: 77.5646,
      distance_km: 18.2,
      current_price: 7100,
      price_unit: 'Quintal',
    },
    {
      market_name: 'Adoni Market',
      latitude: 12.9116,
      longitude: 77.6546,
      distance_km: 24.0,
      current_price: 2183,
      price_unit: 'Quintal',
    },
  ],
  distance_info: '3 markets found within 30 km range of your farm.',
  geographic_context: {
    district: 'Demo District',
    state: 'Demo State',
    markets_count: 3,
  },
};
