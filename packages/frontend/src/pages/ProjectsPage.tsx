"use client";

import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projectsApi } from "@/services/projectsApi";
import { useThemeStore } from "@/stores/themeStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { GenerationServiceNotice } from "@/components/settings/GenerationServiceNotice";
import { BRAND } from "@/lib/brand";
import { Moon, Settings, Sparkles, Sun, Trash2 } from "lucide-react";
import type { Project } from "@/types";

export default function ProjectsPage() {
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<number[] | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const { isDark, toggleTheme } = useThemeStore();
  const { openModal: openSettings } = useSettingsStore();

  const { data: projects, isLoading, error } = useQuery({
    queryKey: ["projects"],
    queryFn: () => projectsApi.list(),
    retry: 1,
  });

  const deleteMutation = useMutation({
    mutationFn: (ids: number[]) => projectsApi.deleteMany(ids),
    onSuccess: (_, deletedIds) => {
      setSelectedIds((prev) => prev.filter((id) => !deletedIds.includes(id)));
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const allSelected = projects?.length ? selectedIds.length === projects.length : false;

  const toggleSelectAll = () => {
    if (!projects) return;
    if (allSelected) setSelectedIds([]);
    else setSelectedIds(projects.map((p) => p.id));
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleDeleteClick = (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteTarget([id]);
  };

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return;
    setDeleteTarget([...selectedIds]);
  };

  const getStatusBadge = (status?: string | null) => {
    if (status === "ready") return <span className="badge badge-success badge-sm">ready</span>;
    if (status === "processing" || status === "running")
      return <span className="badge badge-warning badge-sm animate-pulse">generating</span>;
    return <span className="badge badge-secondary badge-sm">{status || "draft"}</span>;
  };

  return (
    <div className="min-h-screen bg-base-100">
      {/* Header */}
      <header className="flex items-center justify-between px-4 h-10 border-b border-base-300">
        <Link to="/" className="flex items-center gap-2 text-sm font-semibold">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </span>
          {BRAND.name}
        </Link>
        <div className="flex items-center gap-1">
          <Link to="/" className="btn btn-ghost btn-xs">
            新建
          </Link>
          <button onClick={toggleTheme} className="btn btn-ghost btn-xs btn-circle" aria-label="主题">
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button onClick={openSettings} className="btn btn-ghost btn-xs btn-circle" aria-label="设置">
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Sub-header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold mb-2">全部项目</h1>
          <p className="mb-4 text-sm text-muted-foreground">管理 {BRAND.cnName} 里的漫剧项目与生成记录。</p>
          <GenerationServiceNotice />
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                disabled={!projects?.length}
                className="checkbox"
              />
              全选
            </label>
            <button
              onClick={handleBatchDelete}
              disabled={selectedIds.length === 0}
              className="btn btn-destructive btn-sm"
            >
              批量删除（{selectedIds.length}）
            </button>
          </div>
        </div>

        {/* Content */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <span className="loading loading-spinner loading-lg" />
            <p className="text-muted-foreground">加载中...</p>
          </div>
        )}

        {error && (
          <div className="card text-center py-12">
            <p className="text-destructive font-bold">加载项目失败，请重试。</p>
          </div>
        )}

        {!isLoading && !error && (!projects || projects.length === 0) && (
          <div className="card text-center py-16">
            <p className="text-4xl mb-4">📄</p>
            <p className="text-lg font-bold mb-2">暂无项目</p>
            <p className="text-muted-foreground text-sm">开始创作你的第一个故事吧！</p>
          </div>
        )}

        {!isLoading && !error && projects && projects.length > 0 && (
          <div className="space-y-2">
            {projects.map((project) => (
              <Link
                key={project.id}
                to={`/project/${project.id}`}
                className="card group hover:-translate-y-0.5 transition-transform block cursor-pointer"
              >
                <div className="flex items-center gap-3 p-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(project.id)}
                    onChange={() => toggleSelect(project.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="checkbox"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold truncate">{project.title}</span>
                      {getStatusBadge(project.status)}
                    </div>
                    {project.story && (
                      <p className="text-sm text-muted-foreground truncate mt-1">
                        {project.story}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={(e) => handleDeleteClick(project.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-2 hover:bg-error/10 rounded-lg transition-all"
                    title="删除"
                  >
                    <Trash2 className="h-4 w-4 text-error" />
                  </button>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDeleteTarget(null)}>
          <div className="bg-base-100 rounded-2xl max-w-md w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-2">删除项目</h3>
            <p className="text-muted-foreground text-sm mb-6">
              确定要删除选中的 {deleteTarget.length} 个项目吗？删除后无法恢复。
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteTarget(null)} className="btn btn-ghost btn-sm">
                取消
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteTarget)}
                disabled={deleteMutation.isPending}
                className="btn btn-destructive btn-sm"
              >
                {deleteMutation.isPending ? "删除中..." : "删除"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
