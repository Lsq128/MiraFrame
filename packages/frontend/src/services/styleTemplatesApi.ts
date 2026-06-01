/**
 * Style Templates API — preset and custom visual style management.
 */
import { fetchApi } from "./client";
import type {
  StyleTemplate,
  StyleTemplateList,
  StyleTemplateCreatePayload,
  StyleTemplateUpdatePayload,
} from "@/types";

export const styleTemplatesApi = {
  list: (params?: { category?: string }) => {
    const qs = params?.category ? `?category=${params.category}` : "";
    return fetchApi<StyleTemplateList>(`/api/v1/style-templates${qs}`).then(
      (data) => data.items,
    );
  },

  get: (slug: string) =>
    fetchApi<StyleTemplate>(`/api/v1/style-templates/${slug}`),

  create: (data: StyleTemplateCreatePayload) =>
    fetchApi<StyleTemplate>("/api/v1/style-templates", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (slug: string, data: StyleTemplateUpdatePayload) =>
    fetchApi<StyleTemplate>(`/api/v1/style-templates/${slug}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (slug: string) =>
    fetchApi<void>(`/api/v1/style-templates/${slug}`, {
      method: "DELETE",
    }),
};
