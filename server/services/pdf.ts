import type { Profile } from "../../shared/schemas.ts";
import { sectionText } from "../../shared/schemas.ts";
import PDFDocument from "pdfkit";
import { translate } from "../../shared/i18n.ts";
import { filledSections, sectionBlocks, splitList } from "../../shared/resumeFormat.ts";
import path from "node:path";
const font = path.resolve("assets/fonts/NotoSans.ttf");

/** A4 resume: name and contacts on top, then every filled section with headings and bullet lists. */
export function renderResume(profile: Profile, language: string, template = "modern") {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 48, bottom: 48, left: 52, right: 52 },
      info: { Title: profile.name || translate(language, "Resume"), Author: "WorkFinder" },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.font(font);
    const accent = template === "classic" ? "#25344a" : "#176950";
    const ink = "#25372e";
    const muted = "#5b6a61";
    const left = doc.page.margins.left;
    const width = doc.page.width - left - doc.page.margins.right;
    const bottom = () => doc.page.height - doc.page.margins.bottom;
    // Start a new page when fewer than `space` points remain.
    const ensure = (space: number) => {
      if (doc.y + space > bottom()) doc.addPage();
    };

    // Header
    doc.fillColor(accent).fontSize(24).text(sectionText(profile.name) || translate(language, "Your name"), left, doc.y, { width });
    const role = sectionText(profile.occupation);
    if (role) doc.moveDown(0.15).fillColor(ink).fontSize(12.5).text(role, { width });
    const meta = [[profile.city, profile.country].map(sectionText).filter(Boolean).join(", "), sectionText(profile.contact)]
      .filter(Boolean)
      .join("   ·   ");
    if (meta) doc.moveDown(0.3).fillColor(muted).fontSize(9.5).text(meta, { width });
    doc.moveDown(0.6);
    doc.moveTo(left, doc.y).lineTo(left + width, doc.y).lineWidth(1.2).strokeColor(accent).stroke();

    for (const [label, key, text] of filledSections(profile)) {
      ensure(70);
      doc.moveDown(1.1);
      doc.fillColor(accent).fontSize(10.5).text(translate(language, label).toUpperCase(), left, doc.y, { width, characterSpacing: 0.6 });
      const ruleY = doc.y + 2;
      doc.moveTo(left, ruleY).lineTo(left + width, ruleY).lineWidth(0.5).strokeColor("#c9d3cc").stroke();
      doc.y = ruleY + 6;
      if (key === "skills") {
        doc.fillColor(ink).fontSize(10).text(splitList(text).join("  ·  "), left, doc.y, { width, lineGap: 3 });
        continue;
      }
      sectionBlocks(text).forEach((block, i) => {
        if (i > 0) doc.moveDown(0.5);
        if (block.title) {
          ensure(40);
          doc.fillColor(ink).fontSize(10.5).text(block.title, left, doc.y, { width, lineGap: 2 });
          doc.moveDown(0.15);
        }
        for (const line of block.lines) {
          ensure(16);
          doc.fillColor(ink).fontSize(10).text(line, left, doc.y, { width, lineGap: 3 });
        }
        for (const line of block.bullets) {
          ensure(16);
          const y = doc.y;
          doc.fillColor(accent).fontSize(10).text("•", left + 4, y, { width: 10 });
          doc.fillColor(ink).fontSize(10).text(line, left + 16, y, { width: width - 16, lineGap: 3 });
        }
      });
    }
    doc.end();
  });
}
