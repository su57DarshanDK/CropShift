import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach } from 'vitest';
import HomePage from '../pages/HomePage';
import { AuthProvider } from '../contexts/AuthContext';
import { saveFarmDetails, saveRecommendation } from '../utils/storage';
import * as api from '../services/api';

describe('HomePage Dashboard Test Suite', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const renderComponent = () => {
    return render(
      <AuthProvider>
        <BrowserRouter>
          <HomePage />
        </BrowserRouter>
      </AuthProvider>
    );
  };

  it('renders greetings and empty state when no farm profile exists', async () => {
    renderComponent();
    expect(await screen.findByText('Namaste, Farmer!')).toBeInTheDocument();

    // Farm profile empty state
    expect(screen.getByText('No Farm Profile')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /input farm details/i })).toBeInTheDocument();

    // Large CTA banner
    expect(screen.getByText('Should you switch to an oilseed crop?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /analyze my farm/i })).toBeInTheDocument();

    // Quick tools links should be visible
    expect(screen.getByText('Profitability')).toBeInTheDocument();
    expect(screen.getByText('Markets')).toBeInTheDocument();
    expect(screen.getByText('Geospatial Map')).toBeInTheDocument();
    expect(screen.getByText('Subsidies')).toBeInTheDocument();
    expect(screen.getByText('IVR Support')).toBeInTheDocument();
  });

  it('renders farm summary and latest analysis details when profile exists', async () => {
    const farmMock = {
      farm_id: 1,
      farm_name: 'Test Farm Profile',
      land_area: 5,
      current_crop: 'Paddy',
      water_availability: 'Limited',
      district: 'Guntur',
      state: 'Andhra Pradesh'
    };
    const recMock = {
      recommended_crop: 'Groundnut',
      suitability_score: 90,
      profitability_score: 85,
      market_score: 75,
      risk_score: 80,
      safety_score: 83,
      decision: 'SWITCH',
      expected_profit: 45000,
      current_crop_profit: 35000,
      profit_difference: 10000,
      reasons: ['Reason A'],
      risks: ['Risk A']
    };

    saveFarmDetails(farmMock);
    saveRecommendation(recMock);

    renderComponent();

    // Greeting is visible
    expect(await screen.findByText('Namaste, Farmer!')).toBeInTheDocument();

    // Farm Summary Card content (await async load from storage fallback)
    expect(await screen.findByText('Test Farm Profile')).toBeInTheDocument();
    expect(await screen.findByText('My Farm Summary')).toBeInTheDocument();
    expect(await screen.findByText('5 Acre')).toBeInTheDocument();
    expect(await screen.findByText('Limited')).toBeInTheDocument();
    expect(await screen.findByText('Guntur, Andhra Pradesh')).toBeInTheDocument();

    // Recommendation card details
    expect(await screen.findByText('Latest Analysis')).toBeInTheDocument();
    expect(await screen.findByText('Good to Switch')).toBeInTheDocument();
    expect(await screen.findByText('83')).toBeInTheDocument();
    expect(await screen.findByText('Groundnut')).toBeInTheDocument();
    expect(await screen.findByText('+₹10,000/acre')).toBeInTheDocument();

    // Large CTA banner is hidden when recommendation exists
    expect(screen.queryByText('Should you switch to an oilseed crop?')).not.toBeInTheDocument();
  });

  it('resets details when clicking Reset button', async () => {
    vi.spyOn(api, 'getMyFarms')
      .mockResolvedValueOnce([{ id: 1, district: 'Tumkur', land_area_acre: 2 }])
      .mockResolvedValueOnce([]);

    vi.spyOn(api, 'getRecommendation').mockResolvedValue({
      decision: 'SWITCH', safety_score: 80, recommended_crop: 'Groundnut', profit_difference: 5000
    } as any);

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const deleteSpy = vi.spyOn(api, 'deleteFarm').mockResolvedValue({ status: 'success', message: 'Farm deleted' });

    renderComponent();

    const resetBtn = await screen.findByRole('button', { name: /reset/i });
    fireEvent.click(resetBtn);

    expect(deleteSpy).toHaveBeenCalledWith(1);
    // Should return back to empty state
    expect(await screen.findByText('No Farm Profile')).toBeInTheDocument();
  });
});
