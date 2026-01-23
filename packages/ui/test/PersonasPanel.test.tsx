import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PersonasPanel } from '../src/components/data-display/PersonasPanel.js';

const personas = [{ id: 'p1', name: 'Guide', summary: 'Helpful' }];

describe('PersonasPanel', () => {
  it('renders list and handles actions', () => {
    const onSelect = vi.fn();
    const onEdit = vi.fn();
    const onDeleteRequest = vi.fn();

    render(
      <PersonasPanel
        selectedId={null}
        onSelect={onSelect}
        onEdit={onEdit}
        personas={personas}
        loading={false}
        error={null}
        onRefresh={vi.fn()}
        onDeleteRequest={onDeleteRequest}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Guide' }));
    expect(onSelect).toHaveBeenCalledWith('p1');

    fireEvent.click(screen.getByTitle('Edit persona'));
    expect(onEdit).toHaveBeenCalledWith('p1');

    fireEvent.click(screen.getByTitle('Delete persona'));
    expect(onDeleteRequest).toHaveBeenCalledWith('p1');
  });
});
