import { Button, Field, Input, Select } from '@/app/admin/_components/forms';

type Props = {
  labels: {
    filterByAction: string;
    /** Label of the empty option that lifts the action filter. */
    allActions: string;
    filterByUser: string;
  };
  /** The action values on offer, in display order; each is also its own label. */
  actionOptions: readonly string[];
  /** The current `?action=` value. */
  actionFilter: string;
  /** The current `?user=` value. */
  userFilter: string;
};

/**
 * A GET form filtering an admin log by `?action=` and `?user=`.
 *
 * The activity log and the audit log each had this written out; the action
 * list and the label namespace were all that differed.
 */
export function ActionUserFilterForm({ labels, actionOptions, actionFilter, userFilter }: Props) {
  return (
    <form className="flex gap-4 mb-6 items-end">
      <Field label={labels.filterByAction} htmlFor="action-filter">
        <Select
          surface="card"
          fullWidth={false}
          id="action-filter"
          name="action"
          defaultValue={actionFilter}
        >
          <option value="">{labels.allActions}</option>
          {actionOptions.map((action) => (
            <option key={action} value={action}>
              {action}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={labels.filterByUser} htmlFor="user-filter">
        <Input
          surface="card"
          fullWidth={false}
          id="user-filter"
          name="user"
          type="text"
          defaultValue={userFilter}
          placeholder="email or username"
        />
      </Field>
      <Button type="submit" variant="primary">
        Filter
      </Button>
    </form>
  );
}
