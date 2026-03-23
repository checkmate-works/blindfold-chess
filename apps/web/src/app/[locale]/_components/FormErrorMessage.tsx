'use client';

export function FormErrorMessage({ message }: { message: string }) {
  return (
    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-center">
      <p className="text-sm text-destructive">{message}</p>
    </div>
  );
}
