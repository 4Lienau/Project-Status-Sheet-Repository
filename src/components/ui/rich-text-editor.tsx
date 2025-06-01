import React, { useState, useCallback, useEffect, useRef } from "react";
import { useEditor, EditorContent, Extension } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Bold from "@tiptap/extension-bold";
import Italic from "@tiptap/extension-italic";
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import Heading from "@tiptap/extension-heading";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import { mergeAttributes } from "@tiptap/core";
import { cn } from "@/lib/utils";
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  List as ListIcon,
  ListOrdered as ListOrderedIcon,
  Heading1 as Heading1Icon,
  Heading2 as Heading2Icon,
  Highlighter as HighlighterIcon,
  Underline as UnderlineIcon,
  Link as LinkIcon,
} from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Start typing...",
  className,
  minHeight = "120px",
}: RichTextEditorProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [localValue, setLocalValue] = useState(value || "");
  const editorRef = useRef(null);

  // Custom extension for tighter line spacing in lists
  const TighterLists = Extension.create({
    name: "tighterLists",
    addGlobalAttributes() {
      return [
        {
          types: ["bulletList", "orderedList"],
          attributes: {
            class: {
              default: "tight-list",
              parseHTML: (element) => element.getAttribute("class"),
              renderHTML: (attributes) => {
                return {
                  class: "tight-list",
                };
              },
            },
          },
        },
      ];
    },
  });

  // Custom extension for bullet list with tighter spacing
  const CustomBulletList = BulletList.extend({
    renderHTML({ HTMLAttributes }) {
      return [
        "ul",
        mergeAttributes(HTMLAttributes, { class: "tight-list" }),
        0,
      ];
    },
  });

  // Custom extension for ordered list with tighter spacing
  const CustomOrderedList = OrderedList.extend({
    renderHTML({ HTMLAttributes }) {
      return [
        "ol",
        mergeAttributes(HTMLAttributes, { class: "tight-list" }),
        0,
      ];
    },
  });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: false,
        orderedList: false,
      }),
      Bold,
      Italic,
      CustomBulletList,
      CustomOrderedList,
      TighterLists,
      Heading.configure({
        levels: [1, 2],
      }),
      Highlight,
      Underline,
      Link.configure({
        openOnClick: true,
      }),
    ],
    content: localValue,
    editable: true,
    injectCSS: true,
    parseOptions: {
      preserveWhitespace: "full",
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setLocalValue(html);
      onChange(html);
    },
    onFocus: () => {
      setIsFocused(true);
    },
    onBlur: () => {
      setIsFocused(false);
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm max-w-none focus:outline-none",
          "min-h-[120px] p-3 rounded-xl border border-input",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "placeholder:text-muted-foreground",
          "tiptap-editor", // Add a class for custom styling
          className, // Apply the passed className which includes bg-white
        ),
        style: `min-height: ${minHeight}`,
      },
    },
  });

  // Store editor reference
  useEffect(() => {
    if (editor) {
      editorRef.current = editor;
    }
  }, [editor]);

  // Update content when external value changes
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      if (value !== localValue) {
        editor.commands.setContent(value || "");
        setLocalValue(value || "");
      }
    }
  }, [editor, value, localValue]);

  // Create handler functions for formatting commands with proper focus handling
  const toggleBold = useCallback(() => {
    if (editor) {
      // Ensure editor has focus before applying formatting
      editor.commands.focus();
      setTimeout(() => {
        editor.commands.toggleBold();
      }, 10);
    }
  }, [editor]);

  const toggleItalic = useCallback(() => {
    if (editor) {
      editor.commands.focus();
      setTimeout(() => {
        editor.commands.toggleItalic();
      }, 10);
    }
  }, [editor]);

  const toggleUnderline = useCallback(() => {
    if (editor) {
      editor.commands.focus();
      setTimeout(() => {
        editor.commands.toggleUnderline();
      }, 10);
    }
  }, [editor]);

  const toggleHighlight = useCallback(() => {
    if (editor) {
      editor.commands.focus();
      setTimeout(() => {
        editor.commands.toggleHighlight();
      }, 10);
    }
  }, [editor]);

  const toggleHeading1 = useCallback(() => {
    if (editor) {
      editor.commands.focus();
      setTimeout(() => {
        editor.commands.toggleHeading({ level: 1 });
      }, 10);
    }
  }, [editor]);

  const toggleHeading2 = useCallback(() => {
    if (editor) {
      editor.commands.focus();
      setTimeout(() => {
        editor.commands.toggleHeading({ level: 2 });
      }, 10);
    }
  }, [editor]);

  const toggleBulletList = useCallback(() => {
    if (editor) {
      editor.commands.focus();
      setTimeout(() => {
        editor.commands.toggleBulletList();
      }, 10);
    }
  }, [editor]);

  const toggleOrderedList = useCallback(() => {
    if (editor) {
      editor.commands.focus();
      setTimeout(() => {
        editor.commands.toggleOrderedList();
      }, 10);
    }
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className={cn("relative", className)}>
      {editor && isFocused && (
        <div className="bg-background rounded-md shadow-md border border-border p-1 flex gap-1 mb-2">
          <button
            type="button"
            className={cn(
              "h-8 w-8 p-0 flex items-center justify-center rounded-md",
              editor.isActive("bold")
                ? "bg-primary text-primary-foreground"
                : "bg-transparent hover:bg-muted",
            )}
            onMouseDown={(e) => {
              e.preventDefault();
              toggleBold();
            }}
            aria-label="Bold"
          >
            <BoldIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={cn(
              "h-8 w-8 p-0 flex items-center justify-center rounded-md",
              editor.isActive("italic")
                ? "bg-primary text-primary-foreground"
                : "bg-transparent hover:bg-muted",
            )}
            onMouseDown={(e) => {
              e.preventDefault();
              toggleItalic();
            }}
            aria-label="Italic"
          >
            <ItalicIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={cn(
              "h-8 w-8 p-0 flex items-center justify-center rounded-md",
              editor.isActive("underline")
                ? "bg-primary text-primary-foreground"
                : "bg-transparent hover:bg-muted",
            )}
            onMouseDown={(e) => {
              e.preventDefault();
              toggleUnderline();
            }}
            aria-label="Underline"
          >
            <UnderlineIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={cn(
              "h-8 w-8 p-0 flex items-center justify-center rounded-md",
              editor.isActive("highlight")
                ? "bg-primary text-primary-foreground"
                : "bg-transparent hover:bg-muted",
            )}
            onMouseDown={(e) => {
              e.preventDefault();
              toggleHighlight();
            }}
            aria-label="Highlight"
          >
            <HighlighterIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={cn(
              "h-8 w-8 p-0 flex items-center justify-center rounded-md",
              editor.isActive("heading", { level: 1 })
                ? "bg-primary text-primary-foreground"
                : "bg-transparent hover:bg-muted",
            )}
            onMouseDown={(e) => {
              e.preventDefault();
              toggleHeading1();
            }}
            aria-label="Heading 1"
          >
            <Heading1Icon className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={cn(
              "h-8 w-8 p-0 flex items-center justify-center rounded-md",
              editor.isActive("heading", { level: 2 })
                ? "bg-primary text-primary-foreground"
                : "bg-transparent hover:bg-muted",
            )}
            onMouseDown={(e) => {
              e.preventDefault();
              toggleHeading2();
            }}
            aria-label="Heading 2"
          >
            <Heading2Icon className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={cn(
              "h-8 w-8 p-0 flex items-center justify-center rounded-md",
              editor.isActive("bulletList")
                ? "bg-primary text-primary-foreground"
                : "bg-transparent hover:bg-muted",
            )}
            onMouseDown={(e) => {
              e.preventDefault();
              toggleBulletList();
            }}
            aria-label="Bullet List"
          >
            <ListIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={cn(
              "h-8 w-8 p-0 flex items-center justify-center rounded-md",
              editor.isActive("orderedList")
                ? "bg-primary text-primary-foreground"
                : "bg-transparent hover:bg-muted",
            )}
            onMouseDown={(e) => {
              e.preventDefault();
              toggleOrderedList();
            }}
            aria-label="Ordered List"
          >
            <ListOrderedIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      <div
        className="relative rounded-xl overflow-hidden"
        onClick={() => editor.commands.focus()}
        style={{ borderRadius: "0.75rem" }}
      >
        <EditorContent editor={editor} />
        {editor.isEmpty && (
          <div className="absolute top-[1.125rem] left-[1.125rem] text-muted-foreground pointer-events-none">
            {placeholder}
          </div>
        )}
      </div>
    </div>
  );
}
