import { Component, ReactNode, ErrorInfo } from "react";
import { AlertTriangle } from "lucide-react";

interface SafeRenderProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface SafeRenderState {
  hasError: boolean;
  error: Error | null;
}

/**
 * A component that safely renders its children, catching any errors that might occur
 * during rendering and displaying a fallback UI instead.
 */
export class SafeRender extends Component<SafeRenderProps, SafeRenderState> {
  constructor(props: SafeRenderProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): SafeRenderState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("Component error caught by SafeRender:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-4 text-center rounded-md bg-destructive/10 text-destructive">
          <AlertTriangle className="h-6 w-6 mb-2" />
          <div className="text-sm font-medium">
            Something went wrong rendering this component
          </div>
          {this.state.error && import.meta.env.MODE === "development" && (
            <div className="mt-2 text-xs overflow-auto max-w-full">
              <p>{this.state.error.message}</p>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
