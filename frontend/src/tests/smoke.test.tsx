import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../App';

describe('App Smoke Test', () => {
  it('renders the role selection landing page', () => {
    render(<App />);
    expect(screen.getByText(/How would you like to continue\?/i)).toBeInTheDocument();
  });
});
