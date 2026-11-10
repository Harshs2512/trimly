"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccordionContextType {
  openItems: string[];
  toggleItem: (value: string) => void;
}

const AccordionContext = React.createContext<AccordionContextType | null>(null);

export interface AccordionProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: "single" | "multiple";
  collapsible?: boolean;
  defaultValue?: string | string[];
}

export const Accordion = React.forwardRef<HTMLDivElement, AccordionProps>(
  ({ type = "single", collapsible = true, defaultValue, className, children, ...props }, ref) => {
    const [openItems, setOpenItems] = React.useState<string[]>(() => {
      if (!defaultValue) return [];
      return Array.isArray(defaultValue) ? defaultValue : [defaultValue];
    });

    const toggleItem = React.useCallback(
      (value: string) => {
        setOpenItems((prev) => {
          const isOpen = prev.includes(value);
          if (type === "single") {
            if (isOpen && collapsible) return [];
            return [value];
          } else {
            return isOpen ? prev.filter((item) => item !== value) : [...prev, value];
          }
        });
      },
      [type, collapsible]
    );

    return (
      <AccordionContext.Provider value={{ openItems, toggleItem }}>
        <div ref={ref} className={className} {...props}>
          {children}
        </div>
      </AccordionContext.Provider>
    );
  }
);
Accordion.displayName = "Accordion";

interface AccordionItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

const AccordionItemContext = React.createContext<{ value: string; isOpen: boolean } | null>(null);

export const AccordionItem = React.forwardRef<HTMLDivElement, AccordionItemProps>(
  ({ className, value, children, ...props }, ref) => {
    const ctx = React.useContext(AccordionContext);
    const isOpen = ctx?.openItems.includes(value) || false;

    return (
      <AccordionItemContext.Provider value={{ value, isOpen }}>
        <div
          ref={ref}
          data-state={isOpen ? "open" : "closed"}
          className={cn("border-b", className)}
          {...props}
        >
          {children}
        </div>
      </AccordionItemContext.Provider>
    );
  }
);
AccordionItem.displayName = "AccordionItem";

export const AccordionTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
  const itemCtx = React.useContext(AccordionItemContext);
  const rootCtx = React.useContext(AccordionContext);
  const isOpen = itemCtx?.isOpen || false;

  return (
    <div className="flex">
      <button
        ref={ref}
        type="button"
        aria-expanded={isOpen}
        data-state={isOpen ? "open" : "closed"}
        onClick={() => {
          if (itemCtx?.value && rootCtx?.toggleItem) {
            rootCtx.toggleItem(itemCtx.value);
          }
        }}
        className={cn(
          "flex flex-1 items-center justify-between py-4 text-left font-medium transition-all hover:underline",
          className
        )}
        {...props}
      >
        <span>{children}</span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200", {
            "rotate-180": isOpen,
          })}
        />
      </button>
    </div>
  );
});
AccordionTrigger.displayName = "AccordionTrigger";

export const AccordionContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const itemCtx = React.useContext(AccordionItemContext);
  const isOpen = itemCtx?.isOpen || false;

  if (!isOpen) return null;

  return (
    <div
      ref={ref}
      data-state={isOpen ? "open" : "closed"}
      className="overflow-hidden text-sm transition-all"
      {...props}
    >
      <div className={cn("pb-4 pt-0", className)}>{children}</div>
    </div>
  );
});
AccordionContent.displayName = "AccordionContent";
