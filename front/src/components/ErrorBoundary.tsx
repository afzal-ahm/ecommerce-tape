import { useRouteError, isRouteErrorResponse, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export function ErrorBoundary() {
  const error = useRouteError();

  // Default error message
  let errorMessage = "Something went wrong";
  let errorDetails = "An unexpected error occurred. Please try again later.";

  // Handle different error types
  if (isRouteErrorResponse(error)) {
    // This is a response from a loader or action
    errorMessage = `${error.status} ${error.statusText}`;
    errorDetails = error.data?.message || "Please check the URL and try again.";
  } else if (error instanceof Error) {
    // This is a JavaScript error
    errorMessage = error.name || "Error";
    errorDetails = error.message || "An unexpected error occurred";
  } else if (typeof error === "string") {
    // This is a string error
    errorMessage = "Error";
    errorDetails = error;
  }

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center p-4 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-10 w-10 text-destructive" />
      </div>
      <h1 className="mt-6 text-2xl font-bold">{errorMessage}</h1>
      <p className="mt-2 max-w-md text-muted-foreground">{errorDetails}</p>

      <div className="mt-6 flex gap-4">
        <Button asChild>
          <Link to="/dashboard">Return to Dashboard</Link>
        </Button>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Refresh Page
        </Button>
      </div>

      {import.meta.env.MODE === "development" && error instanceof Error && (
        <div className="mt-8 max-w-2xl overflow-auto rounded border bg-muted/50 p-4 text-left">
          <p className="font-medium">Debug Information:</p>
          <pre className="mt-2 text-xs text-muted-foreground">
            {error.stack}
          </pre>
        </div>
      )}
    </div>
  );
}
