import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Liquid glass capsules (see `glass` in globals.css). The main action is clear
// glass with a Nile label; colour lives in the label and edge, not a fill.
const buttonVariants = cva(
  "group/button glass glass-bloom inline-flex shrink-0 items-center justify-center rounded-full border-0 text-sm font-semibold whitespace-nowrap outline-none select-none cursor-pointer touch-manipulation focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ring active:not-aria-[haspopup]:scale-[0.97] active:duration-150 disabled:pointer-events-none disabled:opacity-45 aria-invalid:[--edge:var(--edge-red)] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "text-(--glass-nile-fg) [--bloom:var(--bloom-nile)] [--edge:var(--edge-nile)] hover:bg-(--glass-hover)",
        outline:
          "text-foreground hover:bg-(--glass-hover) aria-expanded:bg-(--glass-hover)",
        secondary:
          "text-foreground hover:bg-(--glass-hover) aria-expanded:bg-(--glass-hover)",
        ghost:
          "bg-transparent text-muted-foreground shadow-none backdrop-blur-none hover:bg-(--glass) hover:text-foreground hover:shadow-(--edge) aria-expanded:bg-(--glass) aria-expanded:text-foreground",
        destructive:
          "bg-(--tint-red) text-(--tint-red-fg) [--edge:var(--edge-red)] hover:bg-(--tint-red-hover)",
        success:
          "bg-(--tint-emerald) text-white [--bloom:var(--bloom-emerald)] [--edge:var(--edge-emerald)] [--glass-inner:var(--glow-emerald)] [text-shadow:0_1px_1px_rgb(0_40_25/0.25)] hover:bg-(--tint-emerald-hover)",
        link: "bg-transparent text-primary underline-offset-4 shadow-none backdrop-blur-none hover:underline",
      },
      size: {
        default:
          "h-9 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-6 gap-1 px-2.5 text-xs has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 px-3.5 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        lg: "h-10 gap-1.5 px-5 has-data-[icon=inline-end]:pr-3.5 has-data-[icon=inline-start]:pl-3.5",
        icon: "size-9",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
