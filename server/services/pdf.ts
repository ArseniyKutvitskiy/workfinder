import type { Profile } from "../../shared/schemas.ts";
import PDFDocument from "pdfkit";
import { fileURLToPath } from "node:url";
import { translate } from "../../shared/i18n.ts";
import { RESUME_SECTIONS, resumeSubtitle } from "../../shared/resumeFormat.ts";
import path from "node:path";
const font = path.resolve("assets/fonts/NotoSans.ttf");
export function renderResume(
  profile: Profile,
  language: string,
  template = "modern",
) {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 52,
      info: {
        Title: profile.name || translate(language, "Resume"),
        Author: "WorkFinder",
      },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.font(font);
    const accent = template === "classic" ? "#25344a" : "#176950";
    doc
      .fillColor(accent)
      .fontSize(26)
      .text(profile.name || translate(language, "Your name"));
    doc
      .moveDown(0.4)
      .fillColor("#59655d")
      .fontSize(10)
      .text(resumeSubtitle(profile));
    for (const [label, field] of RESUME_SECTIONS) {
      if (!profile[field]) continue;
      if (doc.y > 690) doc.addPage();
      doc
        .moveDown(1.4)
        .fillColor(accent)
        .fontSize(12)
        .text(translate(language, label));
      doc
        .moveDown(0.6)
        .fillColor("#25372e")
        .fontSize(10)
        .text(profile[field], { lineGap: 4 });
    }
    doc.end();
  });
}
