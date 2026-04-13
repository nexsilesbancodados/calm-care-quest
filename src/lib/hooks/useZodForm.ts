import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type UseFormProps } from "react-hook-form";
import type { z } from "zod";

export function useZodForm<TSchema extends z.ZodType>(
  schema: TSchema,
  options?: Omit<UseFormProps<z.input<TSchema>>, "resolver">,
) {
  return useForm<z.input<TSchema>>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    ...options,
  });
}
