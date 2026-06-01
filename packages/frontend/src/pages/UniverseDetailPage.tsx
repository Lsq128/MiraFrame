"use client";

import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { universesApi } from "@/services/universesApi";
import { projectsApi } from "@/services/projectsApi";
import { getStaticUrl } from "@/services/client";
import type { UniverseDetail, SharedCharacterRead } from "@/types";

export default function UniverseDetailPage() {
  const { universeId } = useParams<{ universeId: string }>();
  const queryClient = useQueryClient();
  const [showAddProject, setShowAddProject] = useState(false);
  const id = universeId ? parseInt(universeId) : null;

  const { data: universe, isLoading } = useQuery({
    queryKey: ["universe", id],
    queryFn: () => universesApi.get(id!),
    enabled: !!id,
  });

  const { data: allProjects } = useQuery({
    queryKey: ["projects"],
    queryFn: () => projectsApi.list(),
    enabled: showAddProject,
  });

  const addProjectMutation = useMutation({
    mutationFn: (projectId: number) => {
      const existingChapters = universe?.chapters || [];
      const maxChapter = existingChapters.reduce((max, c) => Math.max(max, c.chapter_number || 0), 0);
      return universesApi.addProject(id!, projectId, maxChapter + 1);
    },
    onSuccess: () => {
      setShowAddProject(false);
      queryClient.invalidateQueries({ queryKey: ["universe", id] });
    },
  });

  const removeProjectMutation = useMutation({
    mutationFn: (projectId: number) => universesApi.removeProject(id!, projectId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["universe", id] }),
  });

  if (!id) return <div className="p-8 text-center">无效的宇宙 ID</div>;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (!universe) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-lg font-medium">宇宙未找到</p>
        <Link to="/universes" className="btn btn-primary">
          返回宇宙列表
        </Link>
      </div>
    );
  }

  const availableProjects = allProjects?.filter(
    (p) => !universe.chapters?.some((c) => c.project_id === p.id),
  );

  return (
    <div className="min-h-screen bg-base-100">
      {/* Header */}
      <header className="flex items-center px-4 h-12 border-b border-base-300">
        <Link to="/universes" className="text-sm text-muted-foreground hover:text-base-content flex items-center gap-1">
          ← 返回宇宙列表
        </Link>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <Link to="/universes" className="text-sm text-muted-foreground hover:text-base-content flex items-center gap-1 mb-4">
          ← 返回宇宙列表
        </Link>

        <h1 className="text-3xl font-bold underline-sketch mb-2">{universe.name}</h1>
        {universe.description && (
          <p className="text-muted-foreground mb-6">{universe.description}</p>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column */}
          <div className="space-y-6">
            {/* World setting */}
            {universe.world_setting && (
              <div className="card p-4 border-primary/20 bg-primary/5">
                <h3 className="font-bold text-lg mb-2 flex items-center gap-2">🌍 世界观</h3>
                <p className="text-sm whitespace-pre-wrap">{universe.world_setting}</p>
              </div>
            )}

            {/* Style rules */}
            {universe.style_rules && (
              <div className="card p-4 border-secondary/20 bg-secondary/5">
                <h3 className="font-bold text-lg mb-2 flex items-center gap-2">🎨 风格规则</h3>
                <p className="text-sm whitespace-pre-wrap">{universe.style_rules}</p>
              </div>
            )}

            {/* Chapters */}
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-lg flex items-center gap-2">📖 章节列表</h3>
                <button onClick={() => setShowAddProject(true)} className="btn btn-primary btn-xs">
                  添加项目
                </button>
              </div>

              {(!universe.chapters || universe.chapters.length === 0) && (
                <p className="text-sm text-muted-foreground py-4">
                  还没有章节，点击"添加项目"开始
                </p>
              )}

              {universe.chapters
                ?.sort((a, b) => (a.chapter_number || 0) - (b.chapter_number || 0))
                .map((chapter) => (
                  <div
                    key={chapter.id}
                    className="flex items-center gap-3 py-2 border-b border-base-200 last:border-0"
                  >
                    <span className="badge badge-sm">第{chapter.chapter_number}章</span>
                    <Link
                      to={`/project/${chapter.project_id}`}
                      className="flex-1 text-sm font-medium hover:text-primary truncate"
                    >
                      {chapter.project_title || `项目 #${chapter.project_id}`}
                    </Link>
                    {!chapter.is_main_story && (
                      <span className="badge badge-outline badge-xs">外传</span>
                    )}
                    <button
                      onClick={() => removeProjectMutation.mutate(chapter.project_id)}
                      className="text-error hover:bg-error/10 p-1 rounded text-xs"
                    >
                      🗑
                    </button>
                  </div>
                ))}
            </div>
          </div>

          {/* Right column: Shared Characters */}
          <div className="card p-4">
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">👥 共享角色库</h3>

            {(!universe.shared_characters || universe.shared_characters.length === 0) && (
              <p className="text-sm text-muted-foreground py-4">
                还没有共享角色，从项目角色中提升
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              {universe.shared_characters?.map((character) => (
                <SharedCharacterCard key={character.id} character={character} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add Project Modal */}
      {showAddProject && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowAddProject(false)}
        >
          <div
            className="bg-base-100 rounded-2xl max-w-md w-full p-6 shadow-2xl max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-4">添加项目到宇宙</h3>
            {(!availableProjects || availableProjects.length === 0) ? (
              <p className="text-sm text-muted-foreground">没有可添加的项目</p>
            ) : (
              <div className="space-y-1">
                {availableProjects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => addProjectMutation.mutate(project.id)}
                    className="w-full text-left p-3 rounded-lg hover:bg-base-200 transition-colors text-sm"
                  >
                    {project.title}
                  </button>
                ))}
              </div>
            )}
            <div className="flex justify-end mt-4">
              <button onClick={() => setShowAddProject(false)} className="btn btn-ghost btn-sm">
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SharedCharacterCard({ character }: { character: SharedCharacterRead }) {
  const imageUrl = getStaticUrl(character.canonical_image_url);
  const tags = character.character_tags?.split(",").map((t) => t.trim()).filter(Boolean) || [];

  return (
    <div className="card p-3 text-center">
      <div className="w-16 h-16 mx-auto rounded-full bg-base-200 overflow-hidden mb-2">
        {imageUrl ? (
          <img src={imageUrl} alt={character.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>
        )}
      </div>
      <h4 className="font-bold text-sm">{character.name}</h4>
      {tags.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1 mt-1">
          {tags.slice(0, 3).map((tag, i) => (
            <span key={i} className="badge badge-xs bg-primary/10 text-primary">
              {tag}
            </span>
          ))}
        </div>
      )}
      {character.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
          {character.description}
        </p>
      )}
      <span className="badge badge-outline badge-xs mt-2">v{character.version}</span>
    </div>
  );
}
