import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StatusFilter } from './StatusFilter';

const defaultLabels = {
  filterByStatus: 'Status',
  allStatuses: 'All',
  active: 'Active',
  banned: 'Banned',
  anonymous: 'Anonymous',
  deleted: 'Deleted',
};

function renderWithNuqs(
  searchParams?: string | Record<string, string>,
  onUrlUpdate?: (event: { searchParams: URLSearchParams; queryString: string }) => void
) {
  return render(
    <NuqsTestingAdapter searchParams={searchParams} onUrlUpdate={onUrlUpdate}>
      <StatusFilter labels={defaultLabels} />
    </NuqsTestingAdapter>
  );
}

describe('StatusFilter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render a label with the filterByStatus text', () => {
      renderWithNuqs();
      expect(screen.getByLabelText('Status')).toBeInTheDocument();
    });

    it('should render a select element with id status-filter', () => {
      renderWithNuqs();
      const select = screen.getByRole('combobox');
      expect(select).toHaveAttribute('id', 'status-filter');
    });

    it('should render all five options', () => {
      renderWithNuqs();
      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(5);
      expect(options[0]).toHaveTextContent('All');
      expect(options[1]).toHaveTextContent('Active');
      expect(options[2]).toHaveTextContent('Banned');
      expect(options[3]).toHaveTextContent('Anonymous');
      expect(options[4]).toHaveTextContent('Deleted');
    });

    it('should render option values correctly', () => {
      renderWithNuqs();
      const options = screen.getAllByRole('option');
      expect(options[0]).toHaveAttribute('value', '');
      expect(options[1]).toHaveAttribute('value', 'active');
      expect(options[2]).toHaveAttribute('value', 'banned');
      expect(options[3]).toHaveAttribute('value', 'anonymous');
      expect(options[4]).toHaveAttribute('value', 'deleted');
    });

    it('should use provided labels for options', () => {
      const customLabels = {
        filterByStatus: 'Filter',
        allStatuses: 'Show All',
        active: 'Active Users',
        banned: 'Banned Users',
        anonymous: 'Anonymous Users',
        deleted: 'Deleted Users',
      };
      render(
        <NuqsTestingAdapter>
          <StatusFilter labels={customLabels} />
        </NuqsTestingAdapter>
      );
      expect(screen.getByLabelText('Filter')).toBeInTheDocument();
      expect(screen.getByText('Show All')).toBeInTheDocument();
      expect(screen.getByText('Active Users')).toBeInTheDocument();
      expect(screen.getByText('Banned Users')).toBeInTheDocument();
      expect(screen.getByText('Anonymous Users')).toBeInTheDocument();
    });
  });

  describe('initial state', () => {
    it('should default to "All" when no status search param is present', () => {
      renderWithNuqs();
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('');
    });

    it('should reflect "active" status from search params', () => {
      renderWithNuqs({ status: 'active' });
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('active');
    });

    it('should reflect "banned" status from search params', () => {
      renderWithNuqs({ status: 'banned' });
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('banned');
    });

    it('should reflect "anonymous" status from search params', () => {
      renderWithNuqs({ status: 'anonymous' });
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('anonymous');
    });
  });

  describe('onChange behavior', () => {
    it('should update URL with status param when selecting active', async () => {
      const onUrlUpdate = vi.fn();
      renderWithNuqs(undefined, onUrlUpdate);

      const select = screen.getByRole('combobox');
      await act(() => {
        fireEvent.change(select, { target: { value: 'active' } });
      });

      await waitFor(() => {
        expect(onUrlUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            queryString: expect.stringContaining('status=active'),
          })
        );
      });
    });

    it('should update URL with status param when selecting banned', async () => {
      const onUrlUpdate = vi.fn();
      renderWithNuqs(undefined, onUrlUpdate);

      const select = screen.getByRole('combobox');
      await act(() => {
        fireEvent.change(select, { target: { value: 'banned' } });
      });

      await waitFor(() => {
        expect(onUrlUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            queryString: expect.stringContaining('status=banned'),
          })
        );
      });
    });

    it('should update URL with status param when selecting anonymous', async () => {
      const onUrlUpdate = vi.fn();
      renderWithNuqs(undefined, onUrlUpdate);

      const select = screen.getByRole('combobox');
      await act(() => {
        fireEvent.change(select, { target: { value: 'anonymous' } });
      });

      await waitFor(() => {
        expect(onUrlUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            queryString: expect.stringContaining('status=anonymous'),
          })
        );
      });
    });

    it('should remove status param when selecting All', async () => {
      const onUrlUpdate = vi.fn();
      renderWithNuqs({ status: 'active' }, onUrlUpdate);

      const select = screen.getByRole('combobox');
      await act(() => {
        fireEvent.change(select, { target: { value: '' } });
      });

      await waitFor(() => {
        expect(onUrlUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            queryString: expect.not.stringContaining('status='),
          })
        );
      });
    });

    it('should reset page param when changing filter', async () => {
      const onUrlUpdate = vi.fn();
      renderWithNuqs({ page: '3', status: '' }, onUrlUpdate);

      const select = screen.getByRole('combobox');
      await act(() => {
        fireEvent.change(select, { target: { value: 'banned' } });
      });

      await waitFor(() => {
        expect(onUrlUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            queryString: expect.not.stringContaining('page='),
          })
        );
      });
    });

    it('should use push history mode', async () => {
      const onUrlUpdate = vi.fn();
      renderWithNuqs(undefined, onUrlUpdate);

      const select = screen.getByRole('combobox');
      await act(() => {
        fireEvent.change(select, { target: { value: 'active' } });
      });

      await waitFor(() => {
        expect(onUrlUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            options: expect.objectContaining({
              history: 'push',
            }),
          })
        );
      });
    });
  });
});
