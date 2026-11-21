"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { Button } from "@/components/ui/button";

export default function StudentFeedbackPage() {
  return (
    <div className="min-h-screen bg-background">
      <PageShell width="narrow" className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Assessment feedback</h1>
          </div>
          <Button variant="outline" asChild>
            <Link href="/student/assessments">Back to dashboard</Link>
          </Button>
        </div>

        <Card className="p-12 text-center space-y-6 bg-linear-to-br from-primary/5 to-primary/5">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <svg
                className="w-10 h-10 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-foreground">Coming Soon</h2>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              Open feedback from a submitted assessment to see its grading details.
            </p>
          </div>
          <div className="pt-4">
            <p className="text-sm text-muted-foreground">
              Feedback will appear here after your instructor reviews a submission.
            </p>
          </div>
        </Card>

      </PageShell>
    </div>
  );
}
