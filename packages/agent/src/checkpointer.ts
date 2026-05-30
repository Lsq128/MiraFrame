import { MemorySaver } from "@langchain/langgraph";

// Use MemorySaver for development/testing
// In production, switch to PostgresSaver from @langchain/langgraph-checkpoint-postgres
export function createCheckpointer() {
  return new MemorySaver();
}

// For PostgreSQL (used in production):
// import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
// export function createPostgresCheckpointer(connectionString: string) {
//   const checkpointer = new PostgresSaver({ connectionString });
//   return checkpointer;
// }
