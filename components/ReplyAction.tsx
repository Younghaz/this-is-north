'use client';

import { useState } from 'react';
import ReplyForm from './ReplyForm';

export default function ReplyAction({ articleId, parentId }: { articleId: number; parentId: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-sm text-blue-600 hover:underline"
      >
        {open ? 'Cancel' : 'Reply'}
      </button>
      {open ? <ReplyForm articleId={articleId} parentId={parentId} onDone={() => setOpen(false)} /> : null}
    </div>
  );
}