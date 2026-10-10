import Button from "./Button";
import PageShell from "../layout/PageShell";
import Section from "../layout/Section";
import StatePanel from "./StatePanel";

interface LoadErrorProps {
  /** What could not be loaded, for example "services" */
  what: string;
  onRetry: () => void;
}

// Shown in place of a whole page when its content could not be loaded.
export default function LoadError({ what, onRetry }: LoadErrorProps) {
  return (
    <PageShell>
      <Section innerClassName="min-h-[70vh] items-center justify-center">
        <StatePanel
          kind="error"
          title={`We couldn't load the ${what}`}
          message="This is usually a weak or lost connection, or our server is busy for a moment. Nothing you did caused this, and nothing was lost. Please try again."
        >
          <Button type="button" onClick={onRetry} >
            Try again
          </Button>
          <Button variant="secondary" to="/" >
            Back to home
          </Button>
        </StatePanel>
      </Section>
    </PageShell>
  );
}
