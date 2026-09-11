import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

export function Button({ variant = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" }) {
  return <button className={`ui-button ui-button-${variant} ${className}`} {...props} />;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`ui-card ${className}`}>{children}</section>;
}

export function TextField({ label, hint, error, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string }) {
  const messageId = `${props.id ?? props.name}-message`;
  return <label className="ui-field"><span>{label}</span><input aria-describedby={hint || error ? messageId : undefined} aria-invalid={Boolean(error)} {...props} />{(error || hint) && <small className={error ? "ui-field-error" : ""} id={messageId}>{error ?? hint}</small>}</label>;
}

export function TextAreaField({ label, hint, error, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string; error?: string }) {
  const messageId = `${props.id ?? props.name}-message`;
  return <label className="ui-field"><span>{label}</span><textarea aria-describedby={hint || error ? messageId : undefined} aria-invalid={Boolean(error)} {...props} />{(error || hint) && <small className={error ? "ui-field-error" : ""} id={messageId}>{error ?? hint}</small>}</label>;
}

export function Toast({ children, tone = "success" }: { children: ReactNode; tone?: "success" | "error" }) {
  return <div className={`ui-toast ui-toast-${tone}`} role={tone === "error" ? "alert" : "status"}>{children}</div>;
}

export function DataTable({ columns, rows }: { columns: string[]; rows: ReactNode[][] }) {
  return <div className="ui-table-wrap"><table className="ui-table"><thead><tr>{columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div>;
}
