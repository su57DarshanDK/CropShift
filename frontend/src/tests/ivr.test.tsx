import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import IvrPage from '../pages/IvrPage';
import { getIvrRecommendation } from '../services/api';

vi.mock('../services/api', () => ({
  getIvrRecommendation: vi.fn(),
}));

describe('IvrPage Simulator Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('full end to end simulator call details render successfully', async () => {
    vi.mocked(getIvrRecommendation).mockResolvedValue({
      farmer_name: 'Rajesh Kumar',
      voice_script: 'Namaste Rajesh ji. recommended: Groundnut',
      recommendation: {
        recommended_crop: 'Groundnut',
        suitability_score: 87,
        profitability_score: 76,
        market_score: 90,
        risk_score: 28,
        safety_score: 82,
        decision: 'SWITCH',
        expected_profit: 43000,
        current_crop_profit: 34000,
        profit_difference: 9000,
        reasons: [],
        risks: [],
      },
    });

    render(<IvrPage />);

    // Dial Farmer ID 1 using keypad
    const btn1 = screen.getByRole('button', { name: '1' });
    fireEvent.click(btn1);

    expect(screen.getByTestId('phone-screen')).toHaveTextContent('1');

    // Click Call
    const callBtn = screen.getByTestId('start-call-btn');
    fireEvent.click(callBtn);

    // Verify it triggers connecting states
    expect(screen.getByTestId('phone-screen')).toHaveTextContent('Connecting...');

    // Wait for the connected UI details to resolve
    const nameText = await screen.findByTestId('farmer-name');
    expect(nameText).toHaveTextContent('Rajesh Kumar');
    expect(screen.getByText('Namaste Rajesh ji. recommended: Groundnut')).toBeInTheDocument();

    // Verify service called with correct arguments
    expect(getIvrRecommendation).toHaveBeenCalledWith({ farmer_id: 1 });
  });

  test('unknown farmer id outputs clean error states', async () => {
    vi.mocked(getIvrRecommendation).mockRejectedValue({
      response: {
        data: {
          error: {
            code: 'FARMER_NOT_FOUND',
            message: 'Farmer profile does not exist.',
          },
        },
      },
    });

    render(<IvrPage />);

    const btn9 = screen.getByRole('button', { name: '9' });
    fireEvent.click(btn9);

    const callBtn = screen.getByTestId('start-call-btn');
    fireEvent.click(callBtn);

    const errorMsg = await screen.findByTestId('error-message');
    expect(errorMsg).toHaveTextContent('Farmer profile does not exist.');
  });

  test('State: Invalid Input - empty farmerId shows friendly error without calling API', async () => {
    render(<IvrPage />);

    // Press Call without entering any ID
    const callBtn = screen.getByTestId('start-call-btn');
    fireEvent.click(callBtn);

    const errorMsg = await screen.findByTestId('error-message');
    expect(errorMsg).toBeInTheDocument();
    // Should NOT have called the API
    expect(getIvrRecommendation).not.toHaveBeenCalled();
    // No raw technical text
    expect(screen.queryByText('INVALID_INPUT')).not.toBeInTheDocument();
  });
});

