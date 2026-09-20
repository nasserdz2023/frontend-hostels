"use client";

import { DirectionProvider as RadixDirectionProvider } from "@radix-ui/react-direction";

export function DirectionProvider({
    children,
    dir,
}: {
    children: React.ReactNode;
    dir: "rtl" | "ltr";
}) {
    return (
        <RadixDirectionProvider dir={dir}>
            {children}
        </RadixDirectionProvider>
    );
}