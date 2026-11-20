'use client';

import { Button, Field, Input, Select } from '@/app/admin/_components/forms';
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';

type Option = { value: string; label: string };

type Props = {
  /**
   * The filters as the server parsed them, invalid values already replaced by
   * their defaults, so a select never shows a value it has no option for.
   */
  current: {
    menu: string;
    key: string;
    user: string;
    signal: string;
    status: string;
    sort: string;
  };
  menuOptions: readonly string[];
  /** The selected menu's leaderboard keys; empty when no menu is selected. */
  keyOptions: readonly string[];
  signalOptions: readonly Option[];
  statusOptions: readonly Option[];
  sortOptions: readonly Option[];
  /** The values that are the default and so are dropped from the URL. */
  defaults: { status: string; sort: string };
  labels: {
    menu: string;
    allMenus: string;
    key: string;
    allKeys: string;
    signal: string;
    allSignals: string;
    status: string;
    sort: string;
    sortHint: string;
    user: string;
    userPlaceholder: string;
    apply: string;
  };
};

/**
 * The filter bar of the admin challenge results list.
 *
 * Each select writes its value to the URL on change and resets `?page=`, so
 * the list restarts from its first page (as `StatusQueryFilter` does); the
 * player box commits on submit, so typing does not reload the list per key.
 * Changing the menu also clears `?key=`, because a key belongs to one menu and
 * the key options are re-read for the new one on the server.
 */
export function ChallengeResultFilters({
  current,
  menuOptions,
  keyOptions,
  signalOptions,
  statusOptions,
  sortOptions,
  defaults,
  labels,
}: Props) {
  const [, setParams] = useQueryStates({
    menu: parseAsString,
    key: parseAsString,
    user: parseAsString,
    signal: parseAsString,
    status: parseAsString,
    sort: parseAsString,
    page: parseAsInteger,
  });

  function update(changes: Partial<Record<keyof Props['current'], string | null>>) {
    setParams({ ...changes, page: null }, { history: 'push', shallow: false });
  }

  function handleUserSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const trimmed = (formData.get('user') as string | null)?.trim() ?? '';
    update({ user: trimmed || null });
  }

  return (
    <div className="mb-6 space-y-4">
      <div className="flex gap-4 items-end flex-wrap">
        <Field label={labels.menu} htmlFor="challenge-result-menu-filter">
          <Select
            surface="card"
            fullWidth={false}
            id="challenge-result-menu-filter"
            value={current.menu}
            onChange={(e) => update({ menu: e.target.value || null, key: null })}
          >
            <option value="">{labels.allMenus}</option>
            {menuOptions.map((menu) => (
              <option key={menu} value={menu}>
                {menu}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={labels.key} htmlFor="challenge-result-key-filter">
          <Select
            surface="card"
            fullWidth={false}
            id="challenge-result-key-filter"
            value={current.key}
            disabled={!current.menu}
            onChange={(e) => update({ key: e.target.value || null })}
          >
            <option value="">{labels.allKeys}</option>
            {keyOptions.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={labels.signal} htmlFor="challenge-result-signal-filter">
          <Select
            surface="card"
            fullWidth={false}
            id="challenge-result-signal-filter"
            value={current.signal}
            onChange={(e) => update({ signal: e.target.value || null })}
          >
            <option value="">{labels.allSignals}</option>
            {signalOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={labels.status} htmlFor="challenge-result-status-filter">
          <Select
            surface="card"
            fullWidth={false}
            id="challenge-result-status-filter"
            value={current.status}
            onChange={(e) =>
              update({ status: e.target.value === defaults.status ? null : e.target.value })
            }
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={labels.sort} htmlFor="challenge-result-sort-filter">
          <Select
            surface="card"
            fullWidth={false}
            id="challenge-result-sort-filter"
            value={current.sort}
            onChange={(e) =>
              update({ sort: e.target.value === defaults.sort ? null : e.target.value })
            }
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <p className="text-xs text-muted-foreground">{labels.sortHint}</p>
      <form onSubmit={handleUserSubmit} className="flex gap-4 items-end" role="search">
        <Field label={labels.user} htmlFor="challenge-result-user-filter">
          <Input
            surface="card"
            fullWidth={false}
            key={current.user}
            id="challenge-result-user-filter"
            name="user"
            type="search"
            defaultValue={current.user}
            placeholder={labels.userPlaceholder}
          />
        </Field>
        <Button type="submit" variant="primary">
          {labels.apply}
        </Button>
      </form>
    </div>
  );
}
