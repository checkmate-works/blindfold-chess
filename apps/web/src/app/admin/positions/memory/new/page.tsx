import Link from 'next/link';

import { PositionForm } from '../_components/PositionForm';

export default function NewPositionPage() {
  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/positions/memory"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          &larr; Back to list
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-6">New Position</h1>
      <PositionForm />
    </div>
  );
}
