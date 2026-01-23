import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HelpIcon } from '../src/components/feedback/HelpIcon.js';

describe('HelpIcon', () => {
  it('shows tooltip on hover', () => {
    render(<HelpIcon tooltip="Helpful" />);
    const button = screen.getByRole('button', { name: 'Help' });

    fireEvent.mouseEnter(button);
    expect(screen.getByText('Helpful')).toBeInTheDocument();

    fireEvent.mouseLeave(button);
    expect(screen.queryByText('Helpful')).not.toBeInTheDocument();
  });

  it('navigates to doc link', () => {
    window.location.hash = '#/';
    render(<HelpIcon tooltip="Help" docLink="docs" />);
    const button = screen.getByRole('button', { name: 'Help' });
    fireEvent.click(button);
    expect(window.location.hash).toBe('#/docs');
  });
});
