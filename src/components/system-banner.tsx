interface SystemBannerProps {
  text?: string;
  color?: string;
  size?: "xs" | "sm" | "md" | "lg";
  show?: boolean;
}

const sizeClasses: Record<NonNullable<SystemBannerProps["size"]>, string> = {
  xs: "text-xs px-1 py-0.5",
  sm: "text-xs px-2 py-0.5",
  md: "text-sm px-3 py-1",
  lg: "text-base px-4 py-1.5",
};

export function SystemBanner({
  text,
  color = "bg-orange-500",
  size = "sm",
  show = true,
}: SystemBannerProps) {
  if (!show) return null;

  const customColor = color.startsWith("#") ? color : undefined;
  const utilColor = color.startsWith("#") ? "" : color;

  return (
    <div
      class={`fixed top-0 left-0 w-full h-1 z-[100] flex justify-center ${utilColor}`}
      style={customColor ? { backgroundColor: customColor } : undefined}
    >
      <span
        class={`absolute top-full text-white font-bold rounded-b shadow-md ${sizeClasses[size]} ${utilColor}`}
        style={customColor ? { backgroundColor: customColor } : undefined}
      >
        {text}
      </span>
    </div>
  );
}
