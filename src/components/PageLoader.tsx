import { Skeleton } from "@/components/ui/skeleton";

export const PageLoader = () => (
  <div className="min-h-screen bg-background p-6 space-y-6">
    <div className="flex items-center gap-4">
      <Skeleton className="h-10 w-10 rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-xl" />
      ))}
    </div>
    <Skeleton className="h-64 rounded-xl" />
  </div>
);
