"use client";
import { useState } from "react";
import Link from "next/link";
import ReplyForm from "./ReplyForm";
import DeleteCommentButton from "./DeleteCommentButton";
import Image from "next/image";
import dayjs from "dayjs";
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
    <div style={{ marginBottom: '16px', marginLeft: isReply ? '32px' : '0', paddingLeft: isReply ? '16px' : '0', borderLeft: isReply ? '2px solid #e5e7eb' : 'none' }}>
      <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px', background: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div>
            <img
              src={avatarRaw}
              alt={authorName}
              width={40}
              height={40}
              style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1px solid #e5e7eb', objectFit: 'cover', background: '#f3f4f6' }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <a href={`/profile/${node.user_id}`} style={{ fontWeight: 'bold', fontSize: '14px', color: '#111827', textDecoration: 'none' }}>
                {authorName}
              </a>
              <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '8px' }}>{formatDate(node.created_at)}</span>
            </div>
            {parentUser && (
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                Replying to <span style={{ color: '#2563eb' }}>@{parentUser}</span>
              </div>
            )}
            <div style={{ marginTop: '8px' }}>
              <p style={{ fontSize: '14px', color: '#1f2937', lineHeight: '1.6', background: '#f9fafb', borderRadius: '8px', padding: '8px 16px' }}>
                {node.body}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button
                style={{ fontSize: '12px', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}
                onClick={() => setShowReplyForm((v) => !v)}
              >
                {showReplyForm ? "Cancel" : "Reply"}
              </button>
              <DeleteCommentButton commentId={node.id} />
            </div>
            {showReplyForm && (
              <div style={{ marginTop: '8px' }}>
                <ReplyForm
                  articleId={articleId}
                  parentId={node.id}
                  onDone={() => setShowReplyForm(false)}
                />
              </div>
            )}
            {node.children.length > 0 && (
              <div style={{ marginTop: '8px' }}>
                {!showReplies ? (
                  <button
                    style={{ color: '#2563eb', fontSize: '12px', fontWeight: 'bold', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
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
                      style={{ color: '#2563eb', fontSize: '12px', fontWeight: 'bold', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', marginTop: '4px' }}
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
    <div style={{ marginTop: '24px' }}>
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
