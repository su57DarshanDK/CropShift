import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MustardComparisonPage from '../pages/MustardComparisonPage';
import RecommendationPage from '../pages/RecommendationPage';
import { AuthProvider } from '../contexts/AuthContext';
import * as api from '../services/api';
import * as storage from '../utils/storage';

vi.mock('../services/api', async () => {
  const actual = await vi.importActual('../services/api');
  return {
    ...actual,
    getMustardComparison: vi.fn(),
    getOilseedSuitability: vi.fn(),
    getSeeds: vi.fn(),
    compareSeeds: vi.fn(),
    getMyFarms: vi.fn(),
  };
});

describe('Mustard Seed Comparison Feature Test Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const mockComparisonData: api.MustardComparisonResponse = {
    farm_id: 123,
    farm_name: 'Farm #123 (Dharwad, Karnataka)',
    current_crop: 'Paddy',
    land_area_acre: 5,
    soil_type: 'Black Cotton',
    water_availability: 'Available',
    district: 'Dharwad',
    state: 'Karnataka',
    best_mustard_variety: 'DRMRIJ 31 (Giriraj)',
    comparison: [
      {
        variety_id: 3,
        variety_name: 'DRMRIJ 31 (Giriraj)',
        variety_code: 'GIRIRAJ-31',
        suitable_soil_types: 'Black, Clay Loam',
        water_requirement: 'Medium',
        maturity_duration_days: 140,
        suitability_score: 95,
        profitability_score: 90,
        market_score: 85,
        risk_score: 15,
        overall_score: 89,
        expected_yield_per_acre: 10.8,
        yield_unit: 'quintal',
        expected_price_per_unit: 5700,
        production_cost_per_acre: 19500,
        profit_per_acre: 42060,
        estimated_revenue: 307800,
        estimated_cost: 97500,
        estimated_net_profit: 210300,
        decision: 'RECOMMENDED',
        reasons: ['Highly suitable for Black Cotton soil conditions.', 'Generates estimated net profit of ₹42,060/acre.'],
        risks: []
      },
      {
        variety_id: 1,
        variety_name: 'Pusa Mustard 30 (Lesira)',
        variety_code: 'LESIRA-30',
        suitable_soil_types: 'Loamy, Alluvial',
        water_requirement: 'Medium',
        maturity_duration_days: 135,
        suitability_score: 80,
        profitability_score: 82,
        market_score: 80,
        risk_score: 20,
        overall_score: 79,
        expected_yield_per_acre: 9.5,
        expected_price_per_unit: 5650,
        production_cost_per_acre: 18500,
        profit_per_acre: 35175,
        estimated_revenue: 268375,
        estimated_cost: 92500,
        estimated_net_profit: 175875,
        decision: 'SUITABLE',
        reasons: ['Good yield potential.'],
        risks: []
      }
    ]
  };

  it('renders WHICH SEED IS BETTER? feature on RecommendationPage', async () => {
    (api.getMyFarms as any).mockResolvedValue([{ id: 123, current_crop: 'Mustard', land_area_acre: 5, district: 'Dharwad', state: 'Karnataka' }]);
    (api.getOilseedSuitability as any).mockResolvedValue({
      can_oilseed_be_grown: true,
      suitability_status: 'YES — OILSEED CROPS ARE SUITABLE',
      explanation: 'Oilseeds are suitable.',
      suitable_oilseed_crops: [{ crop_id: 1, crop_name: 'Mustard', suitability_score: 95 }],
      district: 'Dharwad',
      state: 'Karnataka',
      land_area_acre: 5,
    });
    (api.getSeeds as any).mockResolvedValue([
      { id: 1, name: 'DRMRIJ 31 (Giriraj)', variety_code: 'GIRIRAJ', expected_yield_per_acre: 10.5, maturity_duration_days: 125, water_requirement: 'Low', profit_per_acre: 42000 },
      { id: 2, name: 'Pusa Bold', variety_code: 'PUSA-BOLD', expected_yield_per_acre: 9.8, maturity_duration_days: 120, water_requirement: 'Low', profit_per_acre: 39000 },
    ]);
    (api.getMustardComparison as any).mockResolvedValue(mockComparisonData);

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/recommendation']}>
          <Routes>
            <Route path="/recommendation" element={<RecommendationPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    const headers = await screen.findAllByText('CAN OILSEED CROPS BE GROWN?');
    expect(headers.length).toBeGreaterThan(0);
    expect(await screen.findByText('YES — OILSEED CROPS ARE SUITABLE')).toBeInTheDocument();
  });

  it('renders parametric route /mustard-comparison/123 with single-farm context, best match, and table', async () => {
    vi.spyOn(api, 'getMustardComparison').mockResolvedValue(mockComparisonData);

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/mustard-comparison/123']}>
          <Routes>
            <Route path="/mustard-comparison/:farmId" element={<MustardComparisonPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    expect(screen.getByText('Mustard Seed Comparison')).toBeInTheDocument();
    expect(screen.getByText('Compare mustard seed varieties specifically for your farm.')).toBeInTheDocument();
    
    const girirajElements = await screen.findAllByText('DRMRIJ 31 (Giriraj)');
    expect(girirajElements.length).toBeGreaterThan(0);

    expect(screen.getByText('🏆 Best Mustard Seed for Your Farm')).toBeInTheDocument();
    expect(screen.getByText('WHY THIS VARIETY IS RECOMMENDED')).toBeInTheDocument();
    expect(screen.getByText('COMPARE MUSTARD SEED VARIETIES')).toBeInTheDocument();
    expect(screen.getByText('Black Cotton')).toBeInTheDocument();
    expect(screen.getByText('5 Acre')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Back to Recommendation/i })).toBeInTheDocument();

    // Verify API called for ONLY farmId 123
    expect(api.getMustardComparison).toHaveBeenCalledWith(123);
  });

  it('displays empty state when no farm ID or profile exists', async () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/mustard-comparison']}>
          <Routes>
            <Route path="/mustard-comparison" element={<MustardComparisonPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    expect(await screen.findByText('No Mustard Variety Data')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start analysis/i })).toBeInTheDocument();
  });

  it('displays error state when API call fails for farm', async () => {
    vi.spyOn(api, 'getMustardComparison').mockRejectedValue({
      response: { data: { error: { code: 'FORBIDDEN', message: 'You do not have access to this farm.' } } }
    });

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/mustard-comparison/999']}>
          <Routes>
            <Route path="/mustard-comparison/:farmId" element={<MustardComparisonPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    expect(await screen.findByText('Comparison Unavailable')).toBeInTheDocument();
    expect(screen.getByText('You do not have access to this farm.')).toBeInTheDocument();
  });
});
