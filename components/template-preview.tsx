import { InvitationRenderer } from "@/components/invitation/invitation-renderer";
import { TemplateDeviceFrame } from "@/components/template-device-frame";
import type { InvitationContent, InvitationTheme } from "@/lib/invitation/schema";

export function TemplatePreview({ content, theme, templateId }: { content: InvitationContent; theme: InvitationTheme; templateId:string }) {
  return <TemplateDeviceFrame><InvitationRenderer content={content} theme={theme} mode="preview" templateId={templateId} /></TemplateDeviceFrame>;
}
