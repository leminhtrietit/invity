type IsolationInput = {
  vercelEnvironment?: "development" | "preview" | "production";
  supabaseUrl: string;
  productionProjectRef?: string;
};

export function assertEnvironmentIsolation(input: IsolationInput) {
  if (
    input.vercelEnvironment === "preview" &&
    input.productionProjectRef &&
    new URL(input.supabaseUrl).hostname.startsWith(`${input.productionProjectRef}.`)
  ) {
    throw new Error("A preview deployment cannot use the production Supabase project.");
  }
}
