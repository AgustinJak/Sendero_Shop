"use client";

import { useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";

interface Props {
  content: string;
  onChange: (html: string) => void;
}

export default function RichTextEditor({ content, onChange }: Props) {
  const [, forceUpdate] = useState(0);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [3, 4] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
    ],
    content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onTransaction: () => {
      forceUpdate((n) => n + 1);
    },
    editorProps: {
      attributes: {
        class:
          "min-h-[120px] px-3 py-2 text-sm text-lavanda-light leading-relaxed focus:outline-none prose-sendero",
      },
    },
  });

  if (!editor) return null;

  function addLink() {
    if (!editor) return;
    const url = prompt("URL del enlace:");
    if (!url) return;
    editor.chain().focus().setLink({ href: url }).run();
  }

  // Prevent mousedown from stealing focus from editor
  function preventFocusLoss(e: React.MouseEvent) {
    e.preventDefault();
  }

  return (
    <div className="bg-navy-deep border border-lavanda/20 rounded-lg overflow-hidden focus-within:border-purpura transition-colors">
      {/* Toolbar */}
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        className="flex flex-wrap gap-0.5 px-2 py-1.5 border-b border-lavanda/10 bg-navy-deep/50"
        onMouseDown={preventFocusLoss}
      >
        <ToolbarBtn
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Negrita"
        >
          <strong>B</strong>
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Cursiva"
        >
          <em>I</em>
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Subrayado"
        >
          <u>U</u>
        </ToolbarBtn>

        <Separator />

        <ToolbarBtn
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          title="Subtítulo"
        >
          H3
        </ToolbarBtn>

        <Separator />

        <ToolbarBtn
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Lista"
        >
          •≡
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Lista numerada"
        >
          1.
        </ToolbarBtn>

        <Separator />

        <ToolbarBtn
          active={editor.isActive("link")}
          onClick={addLink}
          title="Enlace"
        >
          🔗
        </ToolbarBtn>
        {editor.isActive("link") && (
          <ToolbarBtn
            active={false}
            onClick={() => editor.chain().focus().unsetLink().run()}
            title="Quitar enlace"
          >
            ✕
          </ToolbarBtn>
        )}
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  );
}

function ToolbarBtn({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
        active
          ? "bg-purpura/30 text-niebla"
          : "text-lavanda/60 hover:text-lavanda-light hover:bg-lavanda/10"
      }`}
    >
      {children}
    </button>
  );
}

function Separator() {
  return <div className="w-px h-5 bg-lavanda/10 mx-1 self-center" />;
}
