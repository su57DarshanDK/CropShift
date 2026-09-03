import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import RecommendationPage from '../pages/RecommendationPage';
import * as api from '../services/api';

/* ─── Mocks ───────────────────────────────────────────────────────────────── */

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../services/api', async () => {
  const actual = await vi.importActual('../services/api');
  return {
    ...actual,
    getMyFarms: vi.fn(),
    getOilseedSuitability: vi.fn(),
    getSeeds: vi.fn(),
    compareSeeds: vi.fn(),
  };
});

const mockFarm = {
  id: 101,
  current_crop: 'Groundnut',
  land_area_acre: 10,
  soil_type: 'Red Sandy Loam',
  water_availability: 'Available',
  district: 'Tumkur',
  state: 'Karnataka',
};

const mockOilseedSuitabilityData = {
  farm_id: 101,
  farm_name: 'Farm #101 (Tumkur, Karnataka)',
  current_crop: 'Groundnut',
  land_area_acre: 10,
  soil_type: 'Red Sandy Loam',
  water_availability: 'Available',
  district: 'Tumkur',
  state: 'Karnataka',
  can_oilseed_be_grown: true,
  suitability_status: 'YES — OILSEED CROPS ARE SUITABLE',
  explanation: 'Oilseed crops are suitable for your Red Sandy Loam soil and Available water availability.',
  unsuitable_reasons: [],
  suitable_oilseed_crops: [
    {
      crop_id: 6,
      crop_name: 'Groundnut',
      is_oilseed: true,
      water_requirement: 'Medium',
      suitability_score: 92,
      profitability_score: 88,
      reasons: ['High pod yield', 'Ideal soil match'],
    },
    {
      crop_id: 1,
      crop_name: 'Mustard',
      is_oilseed: true,
      water_requirement: 'Low',
      suitability_score: 85,
      profitability_score: 82,
      reasons: ['Low water requirement'],
    },
  ],
  non_oilseed_alternatives: [],
};

const mockSeedsList = [
  {
    id: 6,
    name: 'TAG 24',
    variety_code: 'TAG-24',
    crop_name: 'Groundnut',
    expected_yield_per_acre: 11.5,
    maturity_duration_days: 105,
    water_requirement: 'Medium',
    suitable_soil_types: 'Sandy, Red, Loamy',
    profit_per_acre: 46450,
    suitability_score: 92,
  },
  {
    id: 7,
    name: 'TG 37A',
    variety_code: 'TG-37A',
    crop_name: 'Groundnut',
    expected_yield_per_acre: 10.2,
    maturity_duration_days: 110,
    water_requirement: 'Low',
    suitable_soil_types: 'Red Sandy Loam',
    profit_per_acre: 38230,
    suitability_score: 85,
  },
];

const renderPage = () =>
  render(
    <BrowserRouter>
      <RecommendationPage />
    </BrowserRouter>
  );

describe('RecommendationPage — Oilseed Suitability & Seed Comparison Flow', () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockReset();
    vi.clearAllMocks();
  });

  it('renders EmptyState when no farm data exists in PostgreSQL', async () => {
    (api.getMyFarms as any).mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText('Complete Your Farm Details')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enter farm details/i })).toBeInTheDocument();
  });

  it('renders oilseed suitability YES flow with selectable seeds from PostgreSQL', async () => {
    (api.getMyFarms as any).mockResolvedValue([mockFarm]);
    (api.getOilseedSuitability as any).mockResolvedValue(mockOilseedSuitabilityData);
    (api.getSeeds as any).mockResolvedValue(mockSeedsList);

    renderPage();

    const headers = await screen.findAllByText('CAN OILSEED CROPS BE GROWN?');
    expect(headers.length).toBeGreaterThan(0);
    expect(await screen.findByText('YES — OILSEED CROPS ARE SUITABLE')).toBeInTheDocument();
    expect(await screen.findByText('TAG 24')).toBeInTheDocument();
    expect(screen.getByText('TG 37A')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /compare seeds/i })).toBeInTheDocument();
  });

  it('renders oilseed suitability NO flow when oilseeds are unsuitable', async () => {
    (api.getMyFarms as any).mockResolvedValue([mockFarm]);
    (api.getOilseedSuitability as any).mockResolvedValue({
      ...mockOilseedSuitabilityData,
      can_oilseed_be_grown: false,
      suitability_status: 'NO — OILSEED CROPS ARE NOT SUITABLE',
      explanation: 'Oilseeds are not suitable for this farm.',
      unsuitable_reasons: ['Water availability is insufficient'],
      non_oilseed_alternatives: [
        { crop_id: 1, crop_name: 'Paddy', water_requirement: 'High', suitability_score: 88, expected_yield: '25 quintal/acre' }
      ],
    });

    renderPage();

    expect(await screen.findByText('NO — OILSEED CROPS ARE NOT SUITABLE')).toBeInTheDocument();
    expect(screen.getByText('OILSEED CROPS ARE NOT RECOMMENDED FOR THESE FARM CONDITIONS.')).toBeInTheDocument();
    expect(screen.getByText('Paddy')).toBeInTheDocument();
  });
});
