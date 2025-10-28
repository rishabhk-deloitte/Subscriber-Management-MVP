"use client";

export default function Error({ error }: { error: Error }) {
  return (
    <div className="p-6 card">
      <div className="text-base font-semibold">Something went wrong</div>
      <div className="mt-2 text-sm text-gray-500">{error.message}</div>
    </div>
  );
}
