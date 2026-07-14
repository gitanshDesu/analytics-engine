import { Card, CardContent } from "@/components/ui/Card";
import { AddSiteFlow } from "@/components/tracking/AddSiteFlow";

export const metadata = { title: "Add a site — Analytics Engine" };

export default function AddSitePage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-lg font-semibold text-ink">Add a site</h1>
        <p className="text-sm text-muted">
          We&apos;ll generate a tracking ID and an install snippet for your domain.
        </p>
      </div>

      <Card>
        <CardContent>
          <AddSiteFlow />
        </CardContent>
      </Card>
    </div>
  );
}
