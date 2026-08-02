import Skeleton from "../ui/Skeleton";

export default function ProcessingSkeleton() {
  return (
    <div className="processing-skeleton">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );
}
