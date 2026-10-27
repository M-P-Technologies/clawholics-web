"use client";

import React, { useMemo, useState } from "react";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent, DraggableAttributes, DraggableSyntheticListeners } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type ItemId = string | number;

export type SortableHandleProps = {
  listeners?: DraggableSyntheticListeners;
  attributes?: DraggableAttributes;
  setActivatorNodeRef?: (element: HTMLElement | null) => void;
};

type SortableListItemRenderArgs = {
  dragHandleProps: SortableHandleProps;
  isDragging: boolean;
};

type SortableListItemProps = {
  id: ItemId;
  children: (args: SortableListItemRenderArgs) => React.ReactNode;
};

const SortableListItem = ({ id, children }: SortableListItemProps) => {
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    animateLayoutChanges: () => true,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition || "transform 200ms ease",
  };

  return (
    <div ref={setNodeRef} style={style}>
      {children({
        dragHandleProps: {
          listeners,
          attributes,
          setActivatorNodeRef,
        },
        isDragging,
      })}
    </div>
  );
};

type SortableListProps<T> = {
  items: T[];
  getItemId: (item: T) => ItemId;
  onReorder: (items: T[]) => void | Promise<void>;
  renderItem: (
    item: T,
    args: SortableListItemRenderArgs
  ) => React.ReactNode;
  renderOverlay?: (item: T) => React.ReactNode;
  className?: string;
};

const SortableList = <T,>({
  items,
  getItemId,
  onReorder,
  renderItem,
  renderOverlay,
  className = "",
}: SortableListProps<T>) => {
  const [activeId, setActiveId] = useState<ItemId | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    })
  );

  const itemIds = useMemo(() => items.map(getItemId), [items, getItemId]);

  const activeItem =
    activeId === null
      ? null
      : items.find((item) => getItemId(item) === activeId) ?? null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((item) => getItemId(item) === active.id);
    const newIndex = items.findIndex((item) => getItemId(item) === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(items, oldIndex, newIndex);
    await onReorder(reordered);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragCancel={handleDragCancel}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <div className={className}>
          {items.map((item) => (
            <SortableListItem key={String(getItemId(item))} id={getItemId(item)}>
              {(args) => renderItem(item, args)}
            </SortableListItem>
          ))}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeItem && renderOverlay ? renderOverlay(activeItem) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default SortableList;