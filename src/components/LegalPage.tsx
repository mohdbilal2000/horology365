import { PageHeader } from "@/components/PageHeader";

export interface LegalSection {
  heading: string;
  body: string[];
}

interface LegalPageProps {
  label: string;
  title: string;
  updated: string;
  intro?: string;
  sections: LegalSection[];
}

export function LegalPage({
  label,
  title,
  updated,
  intro,
  sections,
}: LegalPageProps) {
  return (
    <div className="band-light">
      <PageHeader label={label} title={title} intro={intro} />
      <div className="shell max-w-3xl section-y">
        <p className="text-sm text-ink-500">Last updated: {updated}</p>
        <div className="mt-8 space-y-8">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className="font-serif text-xl text-ink">{section.heading}</h2>
              {section.body.map((paragraph, i) => (
                <p key={i} className="mt-2 leading-relaxed text-ink-700">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
