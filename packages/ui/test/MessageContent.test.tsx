import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MessageContent } from '../src/components/chat/MessageContent.js';

describe('MessageContent', () => {
  it('renders markdown with custom classes', () => {
    render(<MessageContent content="Hello `code`" className="extra" />);

    const code = screen.getByText('code');
    expect(code.tagName.toLowerCase()).toBe('code');

    const container = screen.getByText('Hello').closest('div');
    expect(container).toHaveClass('extra');
  });
});
