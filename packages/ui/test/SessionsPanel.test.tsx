import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SessionsPanel } from '../src/components/data-display/SessionsPanel.js';

const sessions = [
  {
    id: 's1',
    createdAt: '2026-01-01T00:00:00.000Z',
    characterName: 'Hero',
    settingName: 'World',
  },
];

describe('SessionsPanel', () => {
  it('renders sessions and delete action', () => {
    const onDelete = vi.fn();
    render(<SessionsPanel sessions={sessions} onDelete={onDelete} />);

    expect(screen.getByText('Hero')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Delete session'));
    expect(onDelete).toHaveBeenCalledWith('s1');
  });

  it('renders empty state', () => {
    render(<SessionsPanel sessions={[]} />);
    expect(screen.getByText('No sessions yet.')).toBeInTheDocument();
  });
});
