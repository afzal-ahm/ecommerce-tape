import React, { useEffect, forwardRef } from "react";
import { Card } from "../ui/card";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import "./editor.css";

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const Editor = forwardRef<any, EditorProps>(
  ({ value, onChange, placeholder = "Write your content here..." }) => {
    // Initialize TipTap editor
    const editor = useEditor({
      extensions: [
        StarterKit,
        Link.configure({
          openOnClick: false,
        }),
        Underline,
      ],
      content: value,
      onUpdate: ({ editor }) => {
        const html = editor.getHTML();
        onChange(html);
      },
      editorProps: {
        attributes: {
          class:
            "prose prose-sm focus:outline-none min-h-[250px] max-w-none p-4",
          placeholder,
        },
      },
    });

    // Update editor content when value prop changes
    useEffect(() => {
      if (editor && value !== editor.getHTML()) {
        editor.commands.setContent(value);
      }
    }, [value, editor]);

    // Create toolbar buttons
    const ToolbarButton = ({
      children,
      action,
      isActive = null,
    }: {
      children: React.ReactNode;
      action: () => void;
      isActive?: (() => boolean) | null;
    }) => (
      <button
        type="button"
        className={`p-2 rounded hover:bg-gray-100 ${isActive && isActive() ? "bg-gray-200" : ""}`}
        onClick={action}
      >
        {children}
      </button>
    );

    return (
      <Card className="overflow-hidden border">
        {editor && (
          <div className="border-b p-2 flex gap-1 flex-wrap items-center">
            <ToolbarButton
              action={() => editor.chain().focus().toggleBold().run()}
              isActive={() => editor.isActive("bold")}
            >
              <strong>B</strong>
            </ToolbarButton>
            <ToolbarButton
              action={() => editor.chain().focus().toggleItalic().run()}
              isActive={() => editor.isActive("italic")}
            >
              <em>I</em>
            </ToolbarButton>
            <ToolbarButton
              action={() => editor.chain().focus().toggleUnderline().run()}
              isActive={() => editor.isActive("underline")}
            >
              <u>U</u>
            </ToolbarButton>
            <ToolbarButton
              action={() => {
                const url = window.prompt("URL", "https://");
                if (url) {
                  editor.chain().focus().setLink({ href: url }).run();
                }
              }}
              isActive={() => editor.isActive("link")}
            >
              🔗
            </ToolbarButton>
            <div className="w-px h-6 bg-gray-200 mx-1"></div>
            <ToolbarButton
              action={() => editor.chain().focus().toggleBulletList().run()}
              isActive={() => editor.isActive("bulletList")}
            >
              • List
            </ToolbarButton>
            <ToolbarButton
              action={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={() => editor.isActive("orderedList")}
            >
              1. List
            </ToolbarButton>
            <div className="w-px h-6 bg-gray-200 mx-1"></div>
            <ToolbarButton
              action={() =>
                editor.chain().focus().toggleHeading({ level: 1 }).run()
              }
              isActive={() => editor.isActive("heading", { level: 1 })}
            >
              H1
            </ToolbarButton>
            <ToolbarButton
              action={() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              }
              isActive={() => editor.isActive("heading", { level: 2 })}
            >
              H2
            </ToolbarButton>
            <ToolbarButton
              action={() =>
                editor.chain().focus().toggleHeading({ level: 3 }).run()
              }
              isActive={() => editor.isActive("heading", { level: 3 })}
            >
              H3
            </ToolbarButton>
            <div className="w-px h-6 bg-gray-200 mx-1"></div>
            <ToolbarButton
              action={() => editor.chain().focus().toggleBlockquote().run()}
              isActive={() => editor.isActive("blockquote")}
            >
              ❝
            </ToolbarButton>
            <ToolbarButton
              action={() => editor.chain().focus().toggleCodeBlock().run()}
              isActive={() => editor.isActive("codeBlock")}
            >
              {"</>"}
            </ToolbarButton>
          </div>
        )}
        <EditorContent editor={editor} />
      </Card>
    );
  }
);
