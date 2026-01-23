import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HelpPopover } from '../src/components/feedback/HelpPopover.js';

describe('HelpPopover', () => {
  it('toggles popover and closes', () => {
    render(
      <HelpPopover title="Info">
        <div>Details</div>
      </HelpPopover>
    );

    const trigger = screen.getByRole('button', { name: 'Help' });
    fireEvent.click(trigger);
    expect(screen.getByText('Details')).toBeInTheDocument();

    const close = screen.getByRole('button', { name: 'Close' });
    fireEvent.click(close);
    expect(screen.queryByText('Details')).not.toBeInTheDocument();
  });

  it('renders doc link', () => {
    render(
      <HelpPopover title="Docs" docLink="docs">
        <div>Content</div>
      </HelpPopover>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Help' }));
    expect(screen.getByText('Read full documentation')).toBeInTheDocument();
  });
});
