import type * as React from "react";
import type * as SelectPrimitive from "@radix-ui/react-select";

export type SelectTriggerProps = React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> & {
	containerClassName?: string;
};

export type SelectContentProps = React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>;
export type SelectItemProps = React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>;
export type NativeSelectProps = React.ComponentProps<"select"> & {
	containerClassName?: string;
};
export type SelectProps = NativeSelectProps;
