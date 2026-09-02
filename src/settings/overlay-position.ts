export type OverlayPoint = {
  x: number;
  y: number;
};

export type OverlayRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function defaultOverlayPosition(
  workArea: OverlayRect,
  size: Pick<OverlayRect, "width" | "height">,
): OverlayPoint {
  return {
    x: workArea.x + Math.round((workArea.width - size.width) / 2),
    y: workArea.y + workArea.height - size.height - 24,
  };
}

export function clampOverlayPosition(
  point: OverlayPoint,
  workArea: OverlayRect,
  size: Pick<OverlayRect, "width" | "height">,
): OverlayPoint {
  const maxX = workArea.x + workArea.width - size.width;
  const maxY = workArea.y + workArea.height - size.height;
  return {
    x: Math.min(Math.max(workArea.x, point.x), maxX),
    y: Math.min(Math.max(workArea.y, point.y), maxY),
  };
}

export function resolveOverlayPosition(
  saved: OverlayPoint | null | undefined,
  workArea: OverlayRect,
  size: Pick<OverlayRect, "width" | "height">,
): OverlayPoint {
  const point = saved ?? defaultOverlayPosition(workArea, size);
  return clampOverlayPosition(point, workArea, size);
}
