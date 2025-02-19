import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const ProjectListSkeleton = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <Card
          key={i}
          className="p-6 bg-card border border-border/40 shadow-lg relative overflow-hidden"
          style={{
            borderRadius: "1rem",
          }}
        >
          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </Card>
      ))}
    </div>
  );
};

export default ProjectListSkeleton;
