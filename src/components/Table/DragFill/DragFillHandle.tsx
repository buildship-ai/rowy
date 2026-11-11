import React from "react";

export interface IDragFillHandleProps {
  columnId: string;
  fieldType: string;
  rowIndex: number;
  disabled?: boolean;
  onStartDragFill: (columnId: string, fieldType: string, rowIndex: number) => void;
}

export default function DragFillHandle({
  columnId,
  fieldType,
  rowIndex,
  disabled = false,
  onStartDragFill,
}: IDragFillHandleProps) {
  if (disabled) return null;

  return (
    <div
      role="button"
      tabIndex={-1}
      aria-label="Drag to fill cells"
      data-testid={`drag-fill-handle-${rowIndex}-${columnId}`}
      onMouseDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onStartDragFill(columnId, fieldType, rowIndex);
      }}
      style={{
        position: "absolute",
        right: -4,
        bottom: -4,
        width: 8,
        height: 8,
        backgroundColor: "var(--color-primary, #3b82f6)",
        border: "1px solid #ffffff",
        cursor: "crosshair",
        zIndex: 10,
      }}
    />
  );
}
