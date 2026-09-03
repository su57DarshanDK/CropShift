import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import HomePage from '../pages/HomePage';
import { AuthProvider } from '../contexts/AuthContext';
import * as api from '../services/api';
import * as storage from '../utils/storage';

vi.mock('../services/api', async () => {
  const actual = await vi.importActual('../services/api');
  return {
    ...actual,
    getMyFarms: vi.fn(),
    getRecommendation: vi.fn(),
    deleteFarm: vi.fn(),
  };
});

describe('Dashboard Reset & Farm Permanent Deletion Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const mockFarms = [
    {
      id: 101,
      district: 'Tumkur',
      state: 'Karnataka',
      land_area_acre: 1,
      water_availability: true,
      soil_type: 'Red Laterite',
      current_crop: { name: 'Paddy' }
    },
    {
      id: 102,
      district: 'Shivamogga',
      state: 'Karnataka',
      land_area_acre: 5,
      water_availability: true,
      soil_type: 'Black Cotton',
      current_crop: { name: 'Paddy' }
    }
  ];

  it('opens confirm dialog when Reset button is clicked and does nothing if cancelled', async () => {
    vi.spyOn(api, 'getMyFarms').mockResolvedValue(mockFarms);
    vi.spyOn(api, 'getRecommendation').mockResolvedValue({
      recommended_crop: 'Groundnut',
      safety_score: 80,
      decision: 'SWITCH',
      profit_difference: 10000,
      reasons: [],
      risks: []
    } as any);

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(
      <AuthProvider>
        <BrowserRouter>
          <HomePage />
        </BrowserRouter>
      </AuthProvider>
    );

    const resetButton = await screen.findByRole('button', { name: /reset/i });
    fireEvent.click(resetButton);

    expect(confirmSpy).toHaveBeenCalledWith(
      expect.stringContaining('Are you sure you want to reset this farm?')
    );
    expect(api.deleteFarm).not.toHaveBeenCalled();
  });

  it('calls deleteFarm API and updates dashboard when single farm is reset and deleted', async () => {
    vi.spyOn(api, 'getMyFarms')
      .mockResolvedValueOnce([mockFarms[0]]) // Initial load: 1 farm
      .mockResolvedValueOnce([]);           // After deletion: 0 farms

    vi.spyOn(api, 'getRecommendation').mockResolvedValue({
      recommended_crop: 'Groundnut',
      safety_score: 80,
      decision: 'SWITCH',
      profit_difference: 10000,
      reasons: [],
      risks: []
    } as any);

    vi.spyOn(api, 'deleteFarm').mockResolvedValue({ status: 'success', message: 'Farm deleted' });
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <AuthProvider>
        <BrowserRouter>
          <HomePage />
        </BrowserRouter>
      </AuthProvider>
    );

    const resetButton = await screen.findByRole('button', { name: /reset/i });
    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(api.deleteFarm).toHaveBeenCalledWith(101);
    });

    expect(await screen.findByText('No Farm Profile')).toBeInTheDocument();
  });

  it('auto-selects next farm when one of multiple farms is deleted', async () => {
    vi.spyOn(api, 'getMyFarms')
      .mockResolvedValueOnce(mockFarms)               // Initial load: 2 farms
      .mockResolvedValueOnce([mockFarms[1]]);          // After deletion: 1 farm (Shivamogga)

    vi.spyOn(api, 'getRecommendation').mockResolvedValue({
      recommended_crop: 'Sunflower',
      safety_score: 85,
      decision: 'SWITCH',
      profit_difference: 12000,
      reasons: [],
      risks: []
    } as any);

    vi.spyOn(api, 'deleteFarm').mockResolvedValue({ status: 'success', message: 'Farm deleted' });
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <AuthProvider>
        <BrowserRouter>
          <HomePage />
        </BrowserRouter>
      </AuthProvider>
    );

    const resetButton = await screen.findByRole('button', { name: /reset/i });
    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(api.deleteFarm).toHaveBeenCalledWith(101);
    });

    // Shivamogga Farm should be automatically selected
    expect(await screen.findByText('Shivamogga Farm')).toBeInTheDocument();
    expect(screen.getByText('5 Acre')).toBeInTheDocument();
  });
});
