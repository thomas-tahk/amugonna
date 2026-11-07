import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import KoreanShelf from './KoreanShelf';

describe('KoreanShelf', () => {
  it('shows source-specific recipe notes and sends selected source to import', async () => {
    const user = userEvent.setup();
    const onPreview = vi.fn();
    render(<KoreanShelf onPreview={onPreview} />);

    expect(screen.getByRole('heading', { name: 'Kimchi Jjigae' })).toBeInTheDocument();
    expect(screen.getByText('김치찌개')).toBeInTheDocument();
    expect(screen.getByText(/other proteins and broths exist/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Preview import Kimchi Jjigae' }));
    expect(onPreview).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Kimchi Jjigae',
      korean: '김치찌개',
      url: 'https://www.koreanbapsang.com/kimchi-jjigae-kimchi-stew/',
    }));
  });
});
