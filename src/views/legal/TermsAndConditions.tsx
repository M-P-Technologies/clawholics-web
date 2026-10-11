"use client";

import { LoadingBar } from "../../components/ui/LoadingBar";
import LoadError from "../../components/ui/LoadError";
import StatePanel from "../../components/ui/StatePanel";
import PageShell from "../../components/layout/PageShell";
import PageHeader from "../../components/layout/PageHeader";
import BackButton from "../../components/layout/BackButton";
import Panel from "../../components/layout/Panel";
import Section from "../../components/layout/Section";
import { useTermsAndConditions } from "../../hooks/useTermsAndConditions";

export default function Terms() {
  const { tacs, loading, error, reload } = useTermsAndConditions();

  if (loading) return <LoadingBar label="Loading terms and conditions" />;
  if (error) return <LoadError what="terms and conditions" onRetry={reload} />;

  return (
    <PageShell>
      <Section innerClassName="max-w-4xl !gap-8">
        <BackButton />
        <PageHeader title="Terms & conditions" />

        {tacs.length === 0 ? (
          <StatePanel
            kind="empty"
            title="Terms are not published yet"
            message="Our terms and conditions are being updated. If you have a question about our policies before booking, please contact us and we will answer it."
          />
        ) : (
          <Panel>
            <div className="flex flex-col gap-4 md:gap-8">
              {tacs.map((tac) => (
                <div key={tac.id} className="flex flex-col gap-2">
                  <h3 className="font-display text-lg font-normal uppercase tracking-widest text-gray-red md:text-xl">
                    {tac.section}
                  </h3>
                  <p className="whitespace-pre-line copy-lead">
                    {tac.content}
                  </p>
                </div>
              ))}
            </div>
          </Panel>
        )}
      </Section>
    </PageShell>
  );
}
