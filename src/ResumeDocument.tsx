import { MapPin, Mail, Briefcase } from "lucide-react";
import type { Profile } from "../shared/schemas.ts";
import { sectionText } from "../shared/schemas.ts";
import { filledSections, sectionBlocks, splitList } from "../shared/resumeFormat.ts";
import { useLanguage } from "./LanguageContext.tsx";

export function ResumeDocument({ profile, compact = false }: { profile: Profile; compact?: boolean }) {
  const { t } = useLanguage();
  const place = [profile.city, profile.country].map(sectionText).filter(Boolean).join(", ");
  const contact = sectionText(profile.contact);
  const occupation = sectionText(profile.occupation);
  return (
    <article className={`resume-doc${compact ? " compact" : ""}`}>
      <header className="resume-doc-head">
        <h2>{sectionText(profile.name) || t("Your name")}</h2>
        {occupation && <p className="resume-doc-role">{occupation}</p>}
        {(place || contact) && (
          <ul className="resume-doc-meta">
            {place && (
              <li>
                <MapPin size={14} aria-hidden="true" />
                {place}
              </li>
            )}
            {contact && (
              <li>
                <Mail size={14} aria-hidden="true" />
                {contact}
              </li>
            )}
          </ul>
        )}
      </header>
      {filledSections(profile).map(([label, key, text]) => (
        <section key={key} className="resume-doc-section">
          <h3>{t(label)}</h3>
          {key === "skills" ? (
            <ul className="resume-doc-chips">
              {splitList(text).map((skill) => (
                <li key={skill}>{skill}</li>
              ))}
            </ul>
          ) : (
            sectionBlocks(text).map((block, i) => (
              <div className="resume-doc-block" key={i}>
                {block.title && (
                  <h4>
                    {["experience", "projects"].includes(key) && <Briefcase size={13} aria-hidden="true" />}
                    {block.title}
                  </h4>
                )}
                {block.lines.map((line, j) => (
                  <p key={j}>{line}</p>
                ))}
                {block.bullets.length > 0 && (
                  <ul>
                    {block.bullets.map((line, j) => (
                      <li key={j}>{line}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))
          )}
        </section>
      ))}
    </article>
  );
}
