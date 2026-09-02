export const OVERLAY_WIDTH = 640;
export const OVERLAY_HEIGHT = 72;

/** Matches overlay-drag-handle placement (px-3 padding, 2rem button). */
export const OVERLAY_DRAG_HANDLE = {
  insetLeft: 8,
  insetTop: 0,
  width: 52,
  height: OVERLAY_HEIGHT,
} as const;

export type ScreenRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function overlayDragHandleScreenRect(
  windowX: number,
  windowY: number,
): ScreenRect {
  return {
    x: windowX + OVERLAY_DRAG_HANDLE.insetLeft,
    y: windowY + OVERLAY_DRAG_HANDLE.insetTop,
    width: OVERLAY_DRAG_HANDLE.width,
    height: OVERLAY_DRAG_HANDLE.height,
  };
}

export function pointInScreenRect(
  px: number,
  py: number,
  rect: ScreenRect,
): boolean {
  return (
    px >= rect.x &&
    px < rect.x + rect.width &&
    py >= rect.y &&
    py < rect.y + rect.height
  );
}

export function cursorOverOverlayDragHandle(
  windowX: number,
  windowY: number,
  cursorX: number,
  cursorY: number,
): boolean {
  return pointInScreenRect(
    cursorX,
    cursorY,
    overlayDragHandleScreenRect(windowX, windowY),
  );
}
