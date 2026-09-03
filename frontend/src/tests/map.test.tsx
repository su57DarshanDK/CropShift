import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import MapPage from '../pages/MapPage';
import { getFarmDetails } from '../utils/storage';

vi.hoisted(() => {
  vi.stubEnv('VITE_USE_MOCKS', 'false');
});

vi.mock('../mocks', () => ({
  __esModule: true,
  USE_MOCKS: false,
  delay: () => Promise.resolve(),
}));

// Mock react-leaflet and leaflet to avoid canvas errors in JSDOM
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: any) => <div data-testid="mock-map-container">{children}</div>,
  TileLayer: () => <div />,
  Marker: ({ children }: any) => <div>{children}</div>,
  Popup: ({ children }: any) => <div>{children}</div>,
  useMap: () => ({
    setView: vi.fn(),
  }),
}));

vi.mock('../utils/storage', () => ({
  getFarmDetails: vi.fn(),
  getRecommendation: vi.fn(() => ({
    recommended_crop: 'Groundnut',
    current_crop_profit: 34000,
  })),
}));

vi.mock('../services/api', () => ({
  getGeospatial: vi.fn().mockImplementation(() =>
    Promise.resolve({
      farm: { farm_id: 1, farm_name: 'Test Farm', latitude: 12.9, longitude: 77.5 },
      nearby_markets: [
        { market_name: 'Market B', latitude: 13.0, longitude: 77.6, distance_km: 15.0 },
        { market_name: 'Market A', latitude: 12.8, longitude: 77.4, distance_km: 5.0 },
      ],
      distance_info: 'Distance info summary',
      geographic_context: { district: 'Dist', state: 'State', markets_count: 2 },
    })
  ),
}));

describe('MapPage Geospatial Tests', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_USE_MOCKS', 'false');
  });
  test('sorted distance listing displays ascending km details', async () => {
    vi.mocked(getFarmDetails).mockReturnValue({
      farm_id: 1,
      farm_name: 'Test Farm',
      land_area: 1,
      current_crop: 'Paddy',
      water_availability: 'Available',
      district: 'Dist',
      state: 'State',
    });

    vi.stubEnv('VITE_USE_MOCKS', 'false');
    render(<BrowserRouter><MapPage /></BrowserRouter>);

    const marketA = await screen.findByRole('button', { name: /Market A/i });
    const marketB = await screen.findByRole('button', { name: /Market B/i });
    expect(marketA).toBeInTheDocument();
    expect(marketB).toBeInTheDocument();

    // Verify ordering by resolving positions of A and B
    const textContent = screen.getByText('Nearby Market Yards').parentElement?.textContent || '';
    const indexA = textContent.indexOf('Market A');
    const indexB = textContent.indexOf('Market B');
    expect(indexA).toBeLessThan(indexB);
  });

  test('missing coordinates renders fallback UI instead of crashing', async () => {
    vi.mocked(getFarmDetails).mockReturnValue({
      farm_id: 1,
      farm_name: 'Test Farm',
      land_area: 1,
      current_crop: 'Paddy',
      water_availability: 'Available',
      district: 'Dist',
      state: 'State',
    });

    // Re-mock implementation for this specific test to return empty coordinates
    const apiService = await import('../services/api');
    vi.spyOn(apiService, 'getGeospatial').mockResolvedValueOnce({
      farm: { farm_id: 1, latitude: 0, longitude: 0 },
      nearby_markets: [],
      distance_info: 'No coordinates',
      geographic_context: { district: 'Dist', state: 'State', markets_count: 0 },
    });

    render(<BrowserRouter><MapPage /></BrowserRouter>);
    const fallbackTitle = await screen.findByText('Geospatial Coordinates Missing');
    expect(fallbackTitle).toBeInTheDocument();
  });

  test('State: Error - shows friendly error when geospatial API rejects', async () => {
    vi.mocked(getFarmDetails).mockReturnValue({
      farm_id: 1, farm_name: 'Test Farm', land_area: 1,
      current_crop: 'Paddy', water_availability: 'Available',
      district: 'Dist', state: 'State',
    });
    const apiService = await import('../services/api');
    vi.spyOn(apiService, 'getGeospatial').mockRejectedValue({
      response: { data: { error: { code: 'FARM_NOT_FOUND', message: 'Farm not found' } } },
    });

    render(<BrowserRouter><MapPage /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    // No raw code in DOM
    expect(screen.queryByText('FARM_NOT_FOUND')).not.toBeInTheDocument();
  });

  test('State: Backend Unavailable - NETWORK_ERROR renders connection message', async () => {
    vi.mocked(getFarmDetails).mockReturnValue({
      farm_id: 1, farm_name: 'Test Farm', land_area: 1,
      current_crop: 'Paddy', water_availability: 'Available',
      district: 'Dist', state: 'State',
    });
    const apiService = await import('../services/api');
    vi.spyOn(apiService, 'getGeospatial').mockRejectedValue({ code: 'NETWORK_ERROR' });

    render(<BrowserRouter><MapPage /></BrowserRouter>);
    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent("We couldn't reach the server");
    });
  });
});

