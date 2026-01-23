import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EntityUsagePanel } from '../src/components/data-display/EntityUsagePanel.js';

const sessions = [
  { sessionId: 'sess-1', createdAt: '2026-01-01T00:00:00.000Z', role: 'gm' },
  { sessionId: 'sess-2', createdAt: '2026-01-02T00:00:00.000Z' },
];

describe('EntityUsagePanel', () => {
  it('renders sessions and toggles show more', () => {
    const onSessionClick = vi.fn();
    render(
      <EntityUsagePanel
        entityType="character"
        sessions={sessions}
        totalCount={2}
        maxDisplay={1}
        onSessionClick={onSessionClick}
      />
    );

    fireEvent.click(screen.getByText(/sess-1/i));
    expect(onSessionClick).toHaveBeenCalledWith('sess-1');

    fireEvent.click(screen.getByRole('button', { name: 'Show 1 more...' }));
    expect(screen.getByText(/sess-2/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show less' }));
    expect(screen.queryByText(/sess-2/i)).not.toBeNull();
  });

  it('renders collapsed state', () => {
    render(
      <EntityUsagePanel
        entityType="setting"
        sessions={[]}
        totalCount={0}
        collapsed
        onToggleCollapse={vi.fn()}
      />
    );

    expect(screen.queryByText('Loading usage data...')).not.toBeInTheDocument();
  });
});
