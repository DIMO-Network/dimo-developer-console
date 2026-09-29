'use client';

import { CircleCheck, Info, LoaderCircle, OctagonX, TriangleAlert } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      icons={{
        success: <CircleCheck className="h-4 w-4 text-positive" />,
        info: <Info className="h-4 w-4 text-muted" />,
        warning: <TriangleAlert className="h-4 w-4 text-warning" />,
        error: <OctagonX className="h-4 w-4 text-negative" />,
        loading: <LoaderCircle className="h-4 w-4 animate-spin text-muted" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:rounded-card group-[.toaster]:border-outline group-[.toaster]:bg-overlay group-[.toaster]:text-fg group-[.toaster]:shadow-float',
          description: 'group-[.toast]:text-fg',
          actionButton:
            'group-[.toast]:rounded-full group-[.toast]:bg-btn-primary group-[.toast]:text-btn-primary-fg group-[.toast]:font-semibold',
          cancelButton:
            'group-[.toast]:rounded-full group-[.toast]:border group-[.toast]:border-outline group-[.toast]:bg-control group-[.toast]:text-ink group-[.toast]:font-semibold',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
