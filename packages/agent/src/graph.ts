import { StateGraph, END, START } from "@langchain/langgraph";
import { Phase2State } from "./state.js";
import * as nodes from "./nodes/index.js";

export function buildPhase2Graph() {
  const graph = new StateGraph(Phase2State)
    // Production nodes
    .addNode("plan_outline", nodes.planOutlineNode)
    .addNode("plan_characters", nodes.planCharactersNode)
    .addNode("plan_shots", nodes.planShotsNode)
    .addNode("render_characters", nodes.renderCharactersNode)
    .addNode("render_shots", nodes.renderShotsNode)
    .addNode("compose_videos", nodes.composeVideosNode)
    .addNode("compose_merge", nodes.composeMergeNode)
    .addNode("add_audio", nodes.addAudioNode)

    // Approval nodes
    .addNode("outline_approval", nodes.outlineApprovalNode)
    .addNode("characters_approval", nodes.charactersApprovalNode)
    .addNode("shots_approval", nodes.shotsApprovalNode)
    .addNode("character_images_approval", nodes.characterImagesApprovalNode)
    .addNode("shot_images_approval", nodes.shotImagesApprovalNode)
    .addNode("compose_approval", nodes.composeApprovalNode)

    // Critique nodes
    .addNode("critique_character_images", nodes.critiqueCharacterImagesNode)
    .addNode("critique_shot_images", nodes.critiqueShotImagesNode)

    // Review node
    .addNode("review", nodes.reviewNode)

    // Entry point — supports resuming from a requested stage.
    .addConditionalEdges(START, nodes.routeFromStart, {
      plan_outline: "plan_outline",
      plan_characters: "plan_characters",
      plan_shots: "plan_shots",
      render_characters: "render_characters",
      render_shots: "render_shots",
      compose_videos: "compose_videos",
      review: "review",
    })

    // Production → Approval linear flow
    .addEdge("plan_outline", "outline_approval")
    .addEdge("plan_characters", "characters_approval")
    .addEdge("plan_shots", "shots_approval")
    .addEdge("render_characters", "character_images_approval")
    .addEdge("render_shots", "shot_images_approval")
    .addEdge("add_audio", "compose_approval")

    // Conditional: compose_videos → compose_merge or END
    .addConditionalEdges("compose_videos", nodes.routeAfterComposeVideos, {
      compose_merge: "compose_merge",
      __end__: END,
    })

    // Conditional: compose_merge → add_audio or END
    .addConditionalEdges("compose_merge", nodes.routeAfterComposeMerge, {
      add_audio: "add_audio",
      __end__: END,
    })

    // Approval → next stage or review
    .addConditionalEdges("outline_approval", nodes.routeAfterOutlineApproval, {
      plan_characters: "plan_characters",
      plan_outline: "plan_outline",
      review: "review",
    })
    .addConditionalEdges("characters_approval", nodes.routeAfterCharactersApproval, {
      plan_shots: "plan_shots",
      review: "review",
    })
    .addConditionalEdges("shots_approval", nodes.routeAfterShotsApproval, {
      render_characters: "render_characters",
      review: "review",
    })
    .addConditionalEdges("character_images_approval", nodes.routeAfterCharacterImagesApproval, {
      critique_character_images: "critique_character_images",
      review: "review",
    })
    .addConditionalEdges("shot_images_approval", nodes.routeAfterShotImagesApproval, {
      critique_shot_images: "critique_shot_images",
      review: "review",
    })
    .addConditionalEdges("compose_approval", nodes.routeAfterComposeApproval, {
      __end__: END,
      review: "review",
    })

    // Critique → regenerate or continue
    .addConditionalEdges("critique_character_images", nodes.routeAfterCritiqueCharacterImages, {
      render_characters: "render_characters",
      render_shots: "render_shots",
    })
    .addConditionalEdges("critique_shot_images", nodes.routeAfterCritiqueShotImages, {
      render_shots: "render_shots",
      compose_videos: "compose_videos",
    })

    // Review → target stage
    .addConditionalEdges("review", nodes.routeAfterReview, {
      plan_outline: "plan_outline",
      plan_characters: "plan_characters",
      render_characters: "render_characters",
      compose_videos: "compose_videos",
    });

  return graph;
}

export const phase2Graph = buildPhase2Graph();
