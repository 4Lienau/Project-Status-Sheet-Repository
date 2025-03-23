import React from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { MilestoneSortableItem } from "./MilestoneSortableItem";

interface Task {
  id?: string;
  description: string;
  assignee: string;
  date: string;
  completion: number;
}

interface Milestone {
  id?: string;
  date: string;
  milestone: string;
  owner: string;
  completion: number;
  status: "green" | "yellow" | "red";
  tasks?: Task[];
}

interface MilestoneListProps {
  milestones: Milestone[];
  onMilestonesChange: (milestones: Milestone[]) => void;
  onUpdate: (index: number, values: Partial<Milestone>) => void;
  onDelete: (index: number) => void;
}

export function MilestoneList({
  milestones,
  onMilestonesChange,
  onUpdate,
  onDelete,
}: MilestoneListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = milestones.findIndex(
        (_, index) => `milestone-${index}` === active.id,
      );
      const newIndex = milestones.findIndex(
        (_, index) => `milestone-${index}` === over.id,
      );

      if (oldIndex !== -1 && newIndex !== -1) {
        const newMilestones = arrayMove(milestones, oldIndex, newIndex);
        onMilestonesChange(newMilestones);
      }
    }
  };

  const items = milestones.map((_, index) => `milestone-${index}`);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <div className="space-y-4">
          {milestones.map((milestone, index) => (
            <MilestoneSortableItem
              key={`milestone-${index}`}
              id={`milestone-${index}`}
              milestone={milestone}
              onUpdate={(values) => onUpdate(index, values)}
              onDelete={() => onDelete(index)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
