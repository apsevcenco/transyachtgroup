import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import FontSize from "@tiptap/extension-font-size";
import Highlight from "@tiptap/extension-highlight";
import { useEffect, useState } from "react";

const FONT_SIZES = ["12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px", "40px", "48px"];

const COLORS = [
  "#ffffff", "#cccccc", "#999999", "#666666", "#333333", "#000000",
  "#D4A843", "#c4972e", "#f5d78e",
  "#ff4444", "#ff8844", "#ffcc00", "#44cc44", "#4488ff", "#8844ff", "#ff44ff",
];

const FONT_FAMILIES = [
  { label: "Porter FT", value: "Porter FT" },
  { label: "Wix MadeFor Display", value: "Wix MadeFor Display" },
  { label: "Kalissa", value: "Kalissa" },
  { label: "Antro Vectra", value: "Antro Vectra" },
  { label: "Arial", value: "Arial" },
  { label: "Georgia", value: "Georgia" },
  { label: "Times New Roman", value: "Times New Roman" },
];
function ToolbarButton({
  onClick,
  active,
  disabled,
  children,
  title,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`px-2 py-1.5 rounded text-xs transition-colors ${
        active
          ? "bg-[hsl(43,67%,55%)]/20 text-[hsl(43,67%,55%)]"
          : "text-white/60 hover:text-white hover:bg-white/10"
      } ${disabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);

  const currentColor = editor.getAttributes("textStyle").color || "#ffffff";

  return (
    <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-white/[0.08] bg-black/30">
      <select
        value={editor.getAttributes("textStyle").fontFamily || ""}
        onChange={(e) => {
          if (e.target.value) {
            editor.chain().focus().setFontFamily(e.target.value).run();
          } else {
            editor.chain().focus().unsetFontFamily().run();
          }
        }}
        className="bg-black/60 border border-white/[0.08] rounded px-1.5 py-1 text-xs text-white/70 mr-1 focus:outline-none focus:border-[hsl(43,67%,55%)]/30"
        title="Font Family"
      >
        <option value="">Default</option>
        {FONT_FAMILIES.map((f) => (
          <option key={f.value} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>

      <select
        value={editor.getAttributes("textStyle").fontSize || ""}
        onChange={(e) => {
          if (e.target.value) {
            editor.chain().focus().setFontSize(e.target.value).run();
          } else {
            editor.chain().focus().unsetFontSize().run();
          }
        }}
        className="bg-black/60 border border-white/[0.08] rounded px-1.5 py-1 text-xs text-white/70 mr-1 focus:outline-none focus:border-[hsl(43,67%,55%)]/30"
        title="Font Size"
      >
        <option value="">Size</option>
        {FONT_SIZES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <div className="w-px h-5 bg-white/[0.08] mx-1" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
        title="Bold"
      >
        <strong>B</strong>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
        title="Italic"
      >
        <em>I</em>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive("underline")}
        title="Underline"
      >
        <span className="underline">U</span>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive("strike")}
        title="Strikethrough"
      >
        <span className="line-through">S</span>
      </ToolbarButton>

      <div className="w-px h-5 bg-white/[0.08] mx-1" />

      <div className="relative">
        <ToolbarButton
          onClick={() => {
            setShowColorPicker(!showColorPicker);
            setShowHighlightPicker(false);
          }}
          title="Text Color"
        >
          <span className="flex flex-col items-center">
            <span>A</span>
            <span
              className="w-4 h-1 rounded-sm mt-[-2px]"
              style={{ backgroundColor: currentColor }}
            />
          </span>
        </ToolbarButton>
        {showColorPicker && (
          <div className="absolute top-full left-0 mt-1 bg-[#1a1a1a] border border-white/[0.1] rounded-lg p-2 grid grid-cols-6 gap-1 z-50 shadow-xl">
            {COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => {
                  editor.chain().focus().setColor(color).run();
                  setShowColorPicker(false);
                }}
                className="w-6 h-6 rounded border border-white/10 hover:scale-110 transition-transform cursor-pointer"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        )}
      </div>

      <div className="relative">
        <ToolbarButton
          onClick={() => {
            setShowHighlightPicker(!showHighlightPicker);
            setShowColorPicker(false);
          }}
          active={editor.isActive("highlight")}
          title="Highlight"
        >
          <span className="bg-yellow-400/40 px-0.5">H</span>
        </ToolbarButton>
        {showHighlightPicker && (
          <div className="absolute top-full left-0 mt-1 bg-[#1a1a1a] border border-white/[0.1] rounded-lg p-2 grid grid-cols-6 gap-1 z-50 shadow-xl">
            <button
              type="button"
              onClick={() => {
                editor.chain().focus().unsetHighlight().run();
                setShowHighlightPicker(false);
              }}
              className="w-6 h-6 rounded border border-white/10 hover:scale-110 transition-transform cursor-pointer text-[8px] text-white/50"
              title="Remove highlight"
            >
              &#x2715;
            </button>
            {COLORS.slice(0, 11).map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => {
                  editor.chain().focus().toggleHighlight({ color }).run();
                  setShowHighlightPicker(false);
                }}
                className="w-6 h-6 rounded border border-white/10 hover:scale-110 transition-transform cursor-pointer"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        )}
      </div>

      <div className="w-px h-5 bg-white/[0.08] mx-1" />

      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        active={editor.isActive({ textAlign: "left" })}
        title="Align Left"
      >
        &#x2261;
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        active={editor.isActive({ textAlign: "center" })}
        title="Align Center"
      >
        &#x2263;
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        active={editor.isActive({ textAlign: "right" })}
        title="Align Right"
      >
        &#x2262;
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        active={editor.isActive({ textAlign: "justify" })}
        title="Justify"
      >
        &#x2630;
      </ToolbarButton>

      <div className="w-px h-5 bg-white/[0.08] mx-1" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
        title="Bullet List"
      >
        &bull; List
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
        title="Numbered List"
      >
        1. List
      </ToolbarButton>

      <div className="w-px h-5 bg-white/[0.08] mx-1" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive("heading", { level: 2 })}
        title="Heading"
      >
        H2
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive("heading", { level: 3 })}
        title="Subheading"
      >
        H3
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive("blockquote")}
        title="Quote"
      >
        &ldquo; &rdquo;
      </ToolbarButton>

      <div className="w-px h-5 bg-white/[0.08] mx-1" />

      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Undo"
      >
        &#x21A9;
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Redo"
      >
        &#x21AA;
      </ToolbarButton>
    </div>
  );
}

function InlineToolbar({ editor }: { editor: Editor | null }) {
  const [showColorPicker, setShowColorPicker] = useState(false);

  if (!editor) return null;

  const currentColor = editor.getAttributes("textStyle").color || "#ffffff";

  return (
    <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-white/[0.08] bg-black/30">
      <select
        value={editor.getAttributes("textStyle").fontFamily || ""}
        onChange={(e) => {
          if (e.target.value) {
            editor.chain().focus().setFontFamily(e.target.value).run();
          } else {
            editor.chain().focus().unsetFontFamily().run();
          }
        }}
        className="bg-black/60 border border-white/[0.08] rounded px-1.5 py-1 text-xs text-white/70 mr-1 focus:outline-none focus:border-[hsl(43,67%,55%)]/30"
        title="Font Family"
      >
        <option value="">Default</option>
        {FONT_FAMILIES.map((f) => (
          <option key={f.value} value={f.value}>{f.label}</option>
        ))}
      </select>

      <select
        value={editor.getAttributes("textStyle").fontSize || ""}
        onChange={(e) => {
          if (e.target.value) {
            editor.chain().focus().setFontSize(e.target.value).run();
          } else {
            editor.chain().focus().unsetFontSize().run();
          }
        }}
        className="bg-black/60 border border-white/[0.08] rounded px-1.5 py-1 text-xs text-white/70 mr-1 focus:outline-none focus:border-[hsl(43,67%,55%)]/30"
        title="Font Size"
      >
        <option value="">Size</option>
        {FONT_SIZES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      <div className="w-px h-5 bg-white/[0.08] mx-1" />

      <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold">
        <strong>B</strong>
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic">
        <em>I</em>
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline">
        <span className="underline">U</span>
      </ToolbarButton>

      <div className="w-px h-5 bg-white/[0.08] mx-1" />

      <div className="relative">
        <ToolbarButton onClick={() => setShowColorPicker(!showColorPicker)} title="Text Color">
          <span className="flex flex-col items-center">
            <span>A</span>
            <span className="w-4 h-1 rounded-sm mt-[-2px]" style={{ backgroundColor: currentColor }} />
          </span>
        </ToolbarButton>
        {showColorPicker && (
          <div className="absolute top-full left-0 mt-1 bg-[#1a1a1a] border border-white/[0.1] rounded-lg p-2 grid grid-cols-6 gap-1 z-50 shadow-xl">
            {COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => { editor.chain().focus().setColor(color).run(); setShowColorPicker(false); }}
                className="w-6 h-6 rounded border border-white/10 hover:scale-110 transition-transform cursor-pointer"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function useInlineEditor(content: string, onChange: (html: string) => void) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false }),
      Underline,
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({
        types: ["paragraph"],
        alignments: ["left", "center", "right", "justify"],
      }),
    ],
    content,
    immediatelyRender: true,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "px-3 py-2 min-h-[44px] focus:outline-none text-white/80 text-sm",
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content]);

  return editor;
}

export function SharedToolbarGroup({
  fields,
}: {
  fields: { key: string; label: string; content: string; onChange: (html: string) => void }[];
}) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const editorsRef = useState<Record<string, Editor | null>>(() => ({}))[0];

  const activeEditor = activeKey ? editorsRef[activeKey] : null;

  return (
    <div className="border border-white/[0.08] rounded-lg overflow-hidden bg-black/40">
      <InlineToolbar editor={activeEditor} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/[0.04]">
        {fields.map((f) => (
          <SharedFieldEditor
            key={f.key}
            fieldKey={f.key}
            label={f.label}
            content={f.content}
            onChange={f.onChange}
            onFocus={() => setActiveKey(f.key)}
            isActive={activeKey === f.key}
            registerEditor={(editor) => { editorsRef[f.key] = editor; }}
          />
        ))}
      </div>
    </div>
  );
}

function SharedFieldEditor({
  fieldKey,
  label,
  content,
  onChange,
  onFocus,
  isActive,
  registerEditor,
}: {
  fieldKey: string;
  label: string;
  content: string;
  onChange: (html: string) => void;
  onFocus: () => void;
  isActive: boolean;
  registerEditor: (editor: Editor | null) => void;
}) {
  const editor = useInlineEditor(content, onChange);

  useEffect(() => {
    registerEditor(editor);
  }, [editor]);

  useEffect(() => {
    if (editor) {
      const handleFocus = () => onFocus();
      editor.on("focus", handleFocus);
      return () => { editor.off("focus", handleFocus); };
    }
    return undefined;
  }, [editor, onFocus]);

  return (
    <div
      className={`bg-black/40 p-3 cursor-text ${isActive ? "ring-1 ring-[hsl(43,67%,55%)]/40" : ""}`}
      onClick={() => editor?.commands.focus()}
    >
      <label className="text-[8px] uppercase tracking-[0.3em] text-white/35 font-light block mb-1 pointer-events-none">{label}</label>
      {editor ? <EditorContent editor={editor} /> : <div className="min-h-[44px] text-white/40 text-sm">...</div>}
    </div>
  );
}

export default function RichTextEditor({
  content,
  onChange,
  inline,
}: {
  content: string;
  onChange: (html: string) => void;
  inline?: boolean;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: inline ? false : { levels: [2, 3] },
      }),
      Underline,
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
        alignments: ["left", "center", "right", "justify"],
      }),
    ],
    content,
    immediatelyRender: true,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: inline
          ? "px-3 py-2 min-h-[44px] focus:outline-none text-white/80 text-sm"
          : "px-4 py-3 min-h-[150px] focus:outline-none text-white/80 text-sm",
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content]);

  if (!editor) {
    return (
      <div className="border border-white/[0.08] rounded-lg overflow-hidden bg-black/40 px-4 py-3 min-h-[150px] text-white/40 text-sm">
        Loading editor...
      </div>
    );
  }

  return (
    <div className="border border-white/[0.08] rounded-lg overflow-hidden bg-black/40">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
