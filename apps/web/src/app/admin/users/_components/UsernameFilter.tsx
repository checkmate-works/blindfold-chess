'use client';

import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';

type UsernameFilterProps = {
  labels: {
    searchByUsernameOrEmail: string;
    searchButton: string;
  };
};

/**
 * Username search filter for the admin users page.
 *
 * The input is uncontrolled: its seed value comes from the `?username=` query
 * param, and changes are only committed to the URL on submit (Enter or button
 * click) — matching the user-confirmed "explicit submit, no debounced search"
 * requirement. A `key` prop tied to the URL value remounts the input when the
 * param is changed externally (e.g. cleared from ActiveFilters) so in-progress
 * typing is never clobbered by unrelated sibling re-renders.
 */
export function UsernameFilter({ labels }: UsernameFilterProps) {
  const [{ username }, setParams] = useQueryStates({
    username: parseAsString.withDefault(''),
    page: parseAsInteger.withDefault(1),
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const trimmed = (formData.get('username') as string | null)?.trim() ?? '';
    setParams({ username: trimmed || null, page: null }, { history: 'push', shallow: false });
  };

  return (
    <form onSubmit={handleSubmit} className="mb-4 flex items-end gap-2" role="search">
      <div className="flex-1 max-w-sm">
        <label htmlFor="username-filter" className="block text-sm font-medium mb-1">
          {labels.searchByUsernameOrEmail}
        </label>
        <input
          key={username}
          id="username-filter"
          name="username"
          type="search"
          defaultValue={username}
          placeholder={labels.searchByUsernameOrEmail}
          className="w-full border border-border rounded px-3 py-2 text-sm bg-card"
        />
      </div>
      <button
        type="submit"
        aria-label={labels.searchButton}
        className="border border-border rounded px-4 py-2 text-sm bg-card hover:bg-muted transition-colors"
      >
        {labels.searchButton}
      </button>
    </form>
  );
}
