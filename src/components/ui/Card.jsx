// src/components/ui/Card.jsx
// Base container — Dashboard KPIs, form wrappers, empty states all use it.
//
// Per docs/UI_Design_System.md §8:
//   bg-base-100 border border-base-300 rounded-lg p-4 shadow-sm
//
// Generic: a Card is just a styled box. It accepts an `as` prop to
// render as any element (default `div`) so it can be a section, an
// article, etc., without losing the visual style.

export default function Card({ children, className = '', as: Tag = 'div', ...rest }) {
  return (
    <Tag
      className={`bg-base-100 border border-base-300 rounded-lg p-4 shadow-sm ${className}`.trim()}
      {...rest}
    >
      {children}
    </Tag>
  );
}
