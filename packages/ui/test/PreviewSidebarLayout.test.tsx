import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PreviewSidebarLayout } from '../src/components/layout/PreviewSidebarLayout.js';

describe('PreviewSidebarLayout', () => {
  it('renders title, children, and actions', () => {
    render(
      <PreviewSidebarLayout title="Preview" onSave={vi.fn()} onCancel={vi.fn()}>
        <div>Content</div>
      </PreviewSidebarLayout>
    );

    expect(screen.getByText('Preview')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });
});
