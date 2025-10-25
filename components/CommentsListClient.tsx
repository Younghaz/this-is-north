"use client";
import { useState } from "react";
import ReplyForm from "./ReplyForm";
import DeleteCommentButton from "./DeleteCommentButton";
import dayjs from "dayjs";
import Image from 'next/image';
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

// Types
export type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  email?: string | null;
  avatar_url?: string | null;
};
export type CommentRow = {
  id: number;
  article_id: number;
  body: string;
  created_at: string;
  user_id: string;
  status?: string | null;
  parent_comment_id?: number | null;
  parent_user?: string | null;
};
export type TreeNode = CommentRow & { children: TreeNode[] };

function avatarPlaceholder(name?: string | null, email?: string | null) {
  const base = name || email || "User";
  const initials = base
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(initials)}&backgroundType=gradientLinear`;
}

function formatDate(date: string) {
  return dayjs(date).fromNow();
}

function CommentNode({
  node,
  depth,
  profileById,
  articleId,
  parentUser,
}: {
  node: TreeNode;
  depth: number;
  profileById: Map<string, Profile>;
  articleId: number;
  parentUser?: string;
}) {
  const [showReplies, setShowReplies] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const author = profileById.get(node.user_id);
  const authorName = author?.display_name || author?.username || author?.email || "User";
  const avatarRaw = author?.avatar_url && author.avatar_url.trim() !== "" ? author.avatar_url : avatarPlaceholder(author?.display_name, author?.email);
  const isReply = depth > 0;

  return (
    <div className={`mb-4 ${isReply ? 'ml-8 pl-4 border-l-2 border-gray-200' : ''}`}>
      <div className="border rounded-xl p-4 bg-white">
        <div className="flex items-start gap-3">
          <div>
            <Image
              src={avatarRaw}
              alt={authorName}
              width={40}
              height={40}
              className="rounded-full border object-cover bg-gray-100"
              priority={false}
              unoptimized
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <a href={`/profile/${node.user_id}`} className="font-bold text-sm text-gray-900 no-underline">
                {authorName}
              </a>
              <span className="text-xs text-gray-500 ml-2">{formatDate(node.created_at)}</span>
            </div>
            {parentUser && (
              <div className="text-xs text-gray-500 mb-1">
                Replying to <span className="text-blue-600">@{parentUser}</span>
              </div>
            )}
            <div className="mt-2">
              <p className="text-sm text-gray-800 leading-relaxed bg-gray-50 rounded-lg px-4 py-2">
                {node.body}
              </p>
            </div>
            <div className="flex gap-2 mt-2">
              <button
                className="text-xs text-gray-500 bg-transparent border-none cursor-pointer"
                onClick={() => setShowReplyForm((v) => !v)}
              >
                {showReplyForm ? "Cancel" : "Reply"}
              </button>
              <DeleteCommentButton commentId={node.id} authorUserId={node.user_id} />
            </div>
            {showReplyForm && (
              <div className="mt-2">
                <ReplyForm
                  articleId={articleId}
                  parentId={node.id}
                  onDone={() => setShowReplyForm(false)}
                />
              </div>
            )}
            {node.children.length > 0 && (
              <div className="mt-2">
                {!showReplies ? (
                  <button
                    className="text-blue-600 text-xs font-bold underline bg-transparent border-none cursor-pointer"
                    onClick={() => setShowReplies(true)}
                  >
                    View replies ({node.children.length})
                  </button>
                ) : (
                  <>
                    <div>
                      {node.children.map((child) => (
                        <CommentNode
                          key={child.id}
                          node={child}
                          depth={depth + 1}
                          profileById={profileById}
                          articleId={articleId}
                          parentUser={authorName}
                        />
                      ))}
                    </div>
                    <button
                      className="text-blue-600 text-xs font-bold underline bg-transparent border-none cursor-pointer mt-1"
                      onClick={() => setShowReplies(false)}
                    >
                      Hide replies
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CommentsListClient({ tree, profileById, articleId }: {
  tree: TreeNode[];
  profileById: Map<string, Profile>;
  articleId: number;
}) {
  return (
    <div className="mt-6">
      {tree.length === 0 ? (
        <div className="comment-empty-state">
          <span>No comments yet. <a href="#comment-input">Be the first to comment!</a></span>
        </div>
      ) : (
        tree.map((n) => (
          <CommentNode key={n.id} node={n} depth={0} profileById={profileById} articleId={articleId} />
        ))
      )}
    </div>
  );
}
