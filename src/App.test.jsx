import { render, screen } from '@testing-library/react';
import App from './App';
import { test, expect } from 'vitest';

test('renders login screen', async () => {
  render(<App />);
  // We look for the "Accedi" text inside the h5 or the button
  const loginElements = await screen.findAllByText(/Accedi/i);
  expect(loginElements.length).toBeGreaterThan(0);
});
