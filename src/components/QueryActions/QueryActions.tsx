'use client';
import { FC } from 'react';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
import { Button } from '@/components/Button';
import { formatGraphQL, type GqlRequest } from '@/services/subjects/queries';

// "Copy query" gives developers the exact GraphQL and variables the page ran,
// ready to paste into their own code. "Download JSON" saves the result.
export const QueryActions: FC<{
  request: GqlRequest | null;
  result: unknown;
  filename: string;
}> = ({ request, result, filename }) => (
  <div className="flex items-center gap-1">
    <Button
      variant="ghost"
      disabled={!request}
      onClick={() => {
        if (!request) return;
        void navigator.clipboard.writeText(formatGraphQL(request));
        toast.success('Query copied');
      }}
    >
      Copy query
    </Button>
    <Button
      variant="ghost"
      disabled={result === undefined}
      onClick={() =>
        saveAs(
          new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' }),
          filename,
        )
      }
    >
      Download JSON
    </Button>
  </div>
);
