import React from "react";
import { ChevronRight, Home } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className }) => {
  return (
    <nav className={cn("flex items-center space-x-1 text-sm", className)}>
      <Link
        to="/"
        className="flex items-center text-white/70 hover:text-white transition-colors"
      >
        <Home className="h-4 w-4" />
      </Link>

      {items.map((item, index) => (
        <React.Fragment key={index}>
          <ChevronRight className="h-4 w-4 text-white/50" />
          {item.href && !item.current ? (
            <Link
              to={item.href}
              className="text-white/70 hover:text-white transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span
              className={cn(
                "font-medium",
                item.current ? "text-white" : "text-white/70",
              )}
            >
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

export { Breadcrumb, type BreadcrumbItem };
