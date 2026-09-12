import assert from "node:assert/strict";
import test from "node:test";
import { vowEditorialFixture } from "./fixtures.ts";
import { invitationContentSchema } from "./schema.ts";
import { templateCatalog } from "../templates/catalog.ts";
import { getTemplateFixture } from "../templates/fixtures.ts";

function luminance(hex: string) {
  const channels = hex.slice(1).match(/.{2}/g)?.map((value) => Number.parseInt(value, 16) / 255) ?? [];
  const linear = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(foreground: string, background: string) {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test("Vow Editorial fixture satisfies the renderer contract", () => {
  assert.equal(invitationContentSchema.safeParse(vowEditorialFixture).success, true);
});

test("renderer contract rejects an invalid event date", () => {
  const result = invitationContentSchema.safeParse({ ...vowEditorialFixture, startsAt: "20/12/2026 11:00" });
  assert.equal(result.success, false);
});

test("catalog contains ten unique templates", () => {
  assert.equal(templateCatalog.length, 10);
  assert.equal(new Set(templateCatalog.map((template) => template.id)).size, 10);
});

test("all template body text colors meet WCAG AA contrast", () => {
  for (const template of templateCatalog) {
    assert.ok(contrast(template.theme.ink, template.theme.background) >= 4.5, `${template.id} must keep readable body text`);
  }
});

test("all launch templates have valid category-specific preview content",()=>{
  const titles=new Set<string>();
  for(const template of templateCatalog){const fixture=getTemplateFixture(template.id);assert.equal(invitationContentSchema.safeParse(fixture).success,true,template.id);titles.add(fixture.title)}
  assert.equal(titles.size,templateCatalog.length);
});

test("launch catalog matches the ten promised product names",()=>{
  assert.deepEqual(new Set(templateCatalog.map((item)=>item.name)),new Set(["Vow Editorial","Modern Romance","Trầu Cau","The Promise","Birthday Studio","Little Cloud","New Chapter","Class of Us","Warm Gathering","Evening Toast"]));
});
