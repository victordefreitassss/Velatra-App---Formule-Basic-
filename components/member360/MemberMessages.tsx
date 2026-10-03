import React from "react";
import { type Client360SectionId } from "../../components/client360";
import { ErrorBoundary } from "../../components/ErrorBoundary";
import { AppState, User } from "../../types";
const ClientConversation = React.lazy(() =>
  import("../../pages/MessagesPage").then((module) => ({
    default: module.MessagesPage,
  })),
);

interface Props {
  memberTab: Client360SectionId;
  selectedProfile: User;
  state: AppState;
  setState: any;
  showToast: any;
}

export function MemberMessages({
  memberTab,
  selectedProfile,
  state,
  setState,
  showToast,
}: Props) {
  return (
    <>
      {memberTab === "communication" && (
        <section
          className="va-client-360-conversation"
          aria-label={`Conversation avec ${selectedProfile.name}`}
        >
          <ErrorBoundary>
            <React.Suspense
              fallback={
                <p role="status" className="p-5 text-sm text-zinc-700">
                  Ouverture de la conversation…
                </p>
              }
            >
              <ClientConversation
                state={state}
                setState={setState}
                showToast={showToast}
                embedded
                initialMemberId={Number(selectedProfile.id)}
              />
            </React.Suspense>
          </ErrorBoundary>
        </section>
      )}
    </>
  );
}
