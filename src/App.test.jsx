import { render, screen } from '@testing-library/react';
import App from './App';
import { test, expect } from 'vitest';

test('renders login screen', () => {
  render(<App />);
  const loginElement = screen.getByText(/Accedi/i);
  expect(loginElement).toBeInTheDocument();
});
