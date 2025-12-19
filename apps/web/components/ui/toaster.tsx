'use client';

import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
    return (
        <Sonner
            theme="dark"
            className="toaster group"
            toastOptions={{
                classNames: {
                    toast:
                        "group toast group-[.toaster]:bg-stone-900 group-[.toaster]:text-stone-50 group-[.toaster]:border-stone-800 group-[.toaster]:shadow-lg",
                    description: "group-[.toast]:text-stone-400",
                    actionButton:
                        "group-[.toast]:bg-stone-50 group-[.toast]:text-stone-900",
                    cancelButton:
                        "group-[.toast]:bg-stone-800 group-[.toast]:text-stone-400",
                },
            }}
            {...props}
        />
    )
}

export { Toaster }
