"use client";

import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { universesApi } from "@/services/universesApi";
import type { Universe } from "@/types";

export default function UniversesPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    world_setting: "",
    style_rules: "",
  });

  const { data: universes, isLoading } = useQuery({
    queryKey: ["universes"],
    queryFn: () => universesApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      universesApi.create({
        name: createForm.name,
        description: createForm.description || undefined,
        world_setting: createForm.world_setting || undefined,
        style_rules: createForm.style_rules || undefined,
      }),
    onSuccess: () => {
      setShowCreate(false);
      setCreateForm({ name: "", description: "", world_setting: "", style_rules: "" });
      queryClient.invalidateQueries({ queryKey: ["universes"] });
    },
  });

  return (
    <div className="min-h-screen bg-base-100">
      {/* Header */}
      <header className="flex items-center justify-between px-4 h-12 border-b border-base-300">
        <Link to="/" className="text-sm text-muted-foreground hover:text-base-content flex items-center gap-1">
          ← 返回首页
        </Link>
        <h1 className="text-lg font-bold flex items-center gap-2">
          🌍 IP 宇宙
        </h1>
        <div className="w-20" />
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold underline-sketch mb-1">IP 宇宙</h1>
            <p className="text-sm text-muted-foreground">管理跨项目的共享世界观和角色库</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn btn-primary btn-sm">
            + 创建宇宙
          </button>
        </div>

        {isLoading && (
          <div className="flex justify-center py-16">
            <span className="loading loading-spinner loading-lg" />
          </div>
        )}

        {!isLoading && (!universes || universes.length === 0) && (
          <div className="card text-center py-16">
            <p className="text-5xl mb-4">🌍</p>
            <p className="text-lg font-bold mb-2">还没有 IP 宇宙</p>
            <p className="text-muted-foreground text-sm mb-4">
              创建宇宙来管理跨项目的世界观和共享角色
            </p>
            <button onClick={() => setShowCreate(true)} className="btn btn-primary btn-sm">
              创建第一个宇宙
            </button>
          </div>
        )}

        {!isLoading && universes && universes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {universes.map((universe) => (
              <Link
                key={universe.id}
                to={`/universes/${universe.id}`}
                className="card group hover:-translate-y-1 transition-all duration-200 block"
              >
                {universe.cover_image_url && (
                  <div className="h-32 bg-base-200 overflow-hidden">
                    <img
                      src={universe.cover_image_url}
                      alt={universe.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-bold text-lg underline-sketch mb-1">{universe.name}</h3>
                  {universe.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {universe.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">✨ {universe.projects_count} 章</span>
                    <span className="flex items-center gap-1">👥 {universe.shared_characters_count} 角色</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowCreate(false)}
        >
          <div
            className="bg-base-100 rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-4">创建 IP 宇宙</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1">名称 *</label>
                <input
                  className="input input-bordered"
                  placeholder="如：赛博修仙录"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">描述</label>
                <textarea
                  className="textarea textarea-bordered"
                  rows={4}
                  value={createForm.description}
                  onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">世界观设定</label>
                <textarea
                  className="textarea textarea-bordered"
                  rows={4}
                  value={createForm.world_setting}
                  onChange={(e) => setCreateForm((f) => ({ ...f, world_setting: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">风格规则</label>
                <textarea
                  className="textarea textarea-bordered"
                  rows={3}
                  value={createForm.style_rules}
                  onChange={(e) => setCreateForm((f) => ({ ...f, style_rules: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowCreate(false)} className="btn btn-ghost btn-sm">
                取消
              </button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={!createForm.name.trim() || createMutation.isPending}
                className="btn btn-primary btn-sm"
              >
                {createMutation.isPending ? "创建中..." : "创建"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
