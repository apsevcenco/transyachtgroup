import DOMPurify from "dompurify";

interface CmsContentProps {
  html: string;
  className?: string;
  as?: keyof React.JSX.IntrinsicElements;
  style?: React.CSSProperties;
}

// DOMPurify has no built-in per-CSS-property allowlist for the `style`
// attribute, so it's enforced here via a hook rather than a (nonexistent)
// config option.
const ALLOWED_CSS_PROPERTIES = new Set([
  "color",
  "font-size",
  "font-family",
  "font-weight",
  "letter-spacing",
  "text-align",
]);

DOMPurify.addHook("uponSanitizeAttribute", (_node, data) => {
  if (data.attrName !== "style") return;
  data.attrValue = data.attrValue
    .split(";")
    .map((decl) => decl.trim())
    .filter((decl) => {
      const prop = decl.split(":")[0]?.trim().toLowerCase();
      return prop && ALLOWED_CSS_PROPERTIES.has(prop);
    })
    .join("; ");
});

export function CmsContent({
  html,
  className,
  style,
  as: Tag = "span",
}: CmsContentProps) {
  if (!html) return null;

  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["span", "p", "br", "strong", "em", "u", "s", "h2", "h3", "h4", "ul", "ol", "li", "blockquote", "a"],
    ALLOWED_ATTR: ["style", "href", "target", "rel"],
  });

  return (
    <Tag
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
