'use client';

import type { SearchedUser } from '../../_actions/searchUsers';

type BulkGrantUserTableProps = {
  users: SearchedUser[];
  selectedIds: Set<string>;
  onToggleUser: (userId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
};

export function BulkGrantUserTable({
  users,
  selectedIds,
  onToggleUser,
  onSelectAll,
  onDeselectAll,
}: BulkGrantUserTableProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <p className="text-sm text-muted-foreground">{users.length} user(s) found</p>
        {users.length > 0 && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onSelectAll}
              className="text-xs text-primary hover:underline"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={onDeselectAll}
              className="text-xs text-primary hover:underline"
            >
              Deselect All
            </button>
          </div>
        )}
      </div>

      {users.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="px-3 py-2 w-10"></th>
                <th className="px-3 py-2">Username</th>
                <th className="px-3 py-2">Display Name</th>
                <th className="px-3 py-2">Registered</th>
                <th className="px-3 py-2">Last Sign-in</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.userId} className="border-t border-border">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(user.userId)}
                      onChange={() => onToggleUser(user.userId)}
                      className="rounded"
                    />
                  </td>
                  <td className="px-3 py-2">@{user.username}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {user.displayName ?? '(anonymous)'}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString('en-US')}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {user.lastSignInAt
                      ? new Date(user.lastSignInAt).toLocaleDateString('en-US')
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
