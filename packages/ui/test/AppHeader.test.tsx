import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppHeader } from '../src/components/layout/AppHeader.js';

describe('AppHeader', () => {
  it('shows session info when available', () => {
    render(<AppHeader characterName="Hero" settingName="World" hasSession />);
    expect(screen.getByText('Hero')).toBeInTheDocument();
    expect(screen.getByText('World')).toBeInTheDocument();
  });

  it('shows empty state when no session', () => {
    render(<AppHeader characterName={null} settingName={null} hasSession={false} />);
    expect(screen.getByText('No session selected')).toBeInTheDocument();
  });
});
