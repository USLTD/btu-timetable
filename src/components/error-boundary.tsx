import { Component, type ComponentChildren } from "preact";
import * as m from "@/paraglide/messages";

interface Props {
  children: ComponentChildren;
  fallback?: ComponentChildren;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error) {
        console.error("ErrorBoundary caught:", error);
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;
            return (
                <div class={styles.wrap}>
                    <div class={styles.card}>
                        <h2 class={styles.title}>
                            {m.error_server_error_title()}
                        </h2>
                        <p class={styles.message}>
                            {this.state.error?.message ?? m.error_unexpected()}
                        </p>
                        <button
                            type="button"
                            onClick={() => { this.setState({ hasError: false, error: null }); }}
                            class={styles.button}
                        >
                            {m.try_again()}
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

const styles = {
  wrap: "min-h-screen flex items-center justify-center p-8 bg-gray-100 dark:bg-gray-900",
  card:
    "max-w-md w-full text-center p-8 rounded-xl bg-white shadow-lg space-y-3 dark:bg-gray-800",
  title: "text-xl font-bold text-red-600 dark:text-red-400",
  message: "text-sm text-gray-600 dark:text-gray-400",
  button:
    "inline-flex items-center justify-center py-2 px-6 rounded-lg bg-blue-600 text-white font-medium transition-colors hover:bg-blue-700 cursor-pointer",
};
