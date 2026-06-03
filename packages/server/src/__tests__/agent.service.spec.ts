import { describe, it, expect } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { AgentService } from "../agent/agent.service";
import { RevisionService } from "../agent/revision.service";
import { WsGateway } from "../ws";

describe("AgentService", () => {
  let service: AgentService;

  it("should be defined", async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentService,
        {
          provide: "BullQueue_generation",
          useValue: {
            add: async () => ({ id: "test-job" }),
            getJobs: async () => [],
          },
        },
        {
          provide: "REDIS_CLIENT",
          useValue: { publish: async () => 1 },
        },
        {
          provide: "REDIS_SUBSCRIBER",
          useValue: { subscribe: async () => {}, unsubscribe: () => {}, on: () => {} },
        },
        {
          provide: "DRIZZLE",
          useValue: {
            update: () => ({ set: () => ({ where: async () => {} }) }),
            insert: () => ({ values: async () => {} }),
          },
        },
        {
          provide: WsGateway,
          useValue: { sendToProject: () => {} },
        },
        {
          provide: RevisionService,
          useValue: {
            targetStageFor: () => "plan_outline",
            prepareAssets: async () => {},
            formatUserMessage: () => "feedback",
            formatAcceptedMessage: () => "accepted",
          },
        },
      ],
    }).compile();

    service = module.get<AgentService>(AgentService);
    expect(service).toBeDefined();
  });
});
