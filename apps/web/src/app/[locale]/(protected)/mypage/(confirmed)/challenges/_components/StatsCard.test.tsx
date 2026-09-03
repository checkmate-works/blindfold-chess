import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StatsCard } from './StatsCard';

describe('StatsCard', () => {
  it('writes the comparison as a signed count with the period label', () => {
    render(<StatsCard label="Best" value="12" comparison={{ change: 3, label: 'vs last week' }} />);
    const line = screen.getByText('+3 vs last week');
    expect(line).toHaveClass('text-success');
  });

  it('writes a drop with U+2212 and the destructive colour', () => {
    render(<StatsCard label="Best" value="5" comparison={{ change: -7, label: 'vs last week' }} />);
    expect(screen.getByText('−7 vs last week')).toHaveClass('text-destructive');
  });

  it('writes no change as ±0 in the muted colour', () => {
    render(<StatsCard label="Best" value="5" comparison={{ change: 0, label: 'vs last week' }} />);
    expect(screen.getByText('±0 vs last week')).toHaveClass('text-muted-foreground');
  });

  it('keeps one decimal for averages', () => {
    render(
      <StatsCard
        label="Avg"
        value="8.5"
        comparison={{ change: -1.26, label: 'vs last month', fractionDigits: 1 }}
      />
    );
    expect(screen.getByText('−1.3 vs last month')).toBeInTheDocument();
  });

  it('omits the comparison line when there is nothing to compare against', () => {
    render(
      <StatsCard label="Best" value="5" comparison={{ change: null, label: 'vs last week' }} />
    );
    expect(screen.queryByText(/vs last week/)).not.toBeInTheDocument();
  });
});
