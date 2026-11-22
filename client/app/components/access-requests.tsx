"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StatePanel } from "@/components/ui/state-panel"
import { Check, X } from "lucide-react"
import { useAccessRequestMutations, useAccessRequests } from "@/hooks/queries/useAccessRequests"

interface AccessRequestsProps {
  paperId?: string;
}

export default function AccessRequests({ paperId }: AccessRequestsProps) {
  const { data, isLoading, isError, refetch } = useAccessRequests(paperId);
  const { update } = useAccessRequestMutations();
  const requests = Array.isArray(data) ? data : [];

  return (
    <Card className="shadow-none border-border">
      <div className="border-b border-border px-3 py-2 text-xs font-semibold text-foreground">
        Access Requests
      </div>
      {isLoading && (
        <StatePanel kind="loading" title="Loading access requests" compact />
      )}
      {isError && (
        <StatePanel
          kind="error"
          title="Couldn’t load access requests"
          description="Please try again."
          action={
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Try again
            </Button>
          }
          compact
        />
      )}
      {!isLoading && !isError && requests.length === 0 && (
        <StatePanel kind="empty" title="No access requests yet" compact />
      )}
      {!isLoading && !isError && requests.length > 0 && (
        <div className="divide-y divide-border/70">
          {requests.map((request) => (
            <div
              key={request.id}
              className="flex flex-col items-start justify-between gap-3 p-3 text-xs sm:flex-row sm:p-2.5"
            >
              <div className="flex-1 space-y-0.5">
                <p className="font-semibold text-foreground text-sm leading-tight">
                  {request.student.name}
                </p>
                <p className="text-[11px] text-muted-foreground">{request.student.email}</p>
                <p className="text-[11px] text-muted-foreground">{request.paper.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  Requested: {new Date(request.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex w-full flex-wrap items-center justify-between gap-2 sm:w-auto sm:justify-end">
                <Badge
                  variant={request.status === 'PENDING' ? 'warning' : request.status === 'APPROVED' ? 'success' : 'danger'}
                  className="text-[11px]"
                >
                  {request.status}
                </Badge>
                {request.status === 'PENDING' && (
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      className="gap-1"
                      onClick={() => update.mutate({ id: request.id, status: 'APPROVED' })}
                      disabled={update.isPending}
                    >
                      <Check className="w-3 h-3" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="gap-1"
                      onClick={() => update.mutate({ id: request.id, status: 'REJECTED' })}
                      disabled={update.isPending}
                    >
                      <X className="w-3 h-3" />
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
