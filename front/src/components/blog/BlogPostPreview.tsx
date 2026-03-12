import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { getImageUrl } from "@/utils/image";

interface BlogPostPreviewProps {
  title: string;
  content: string;
  coverImage?: string | null;
}

export const BlogPostPreview: React.FC<BlogPostPreviewProps> = ({
  title,
  content,
  coverImage,
}) => {
  return (
    <Card className="overflow-hidden">
      {coverImage && (
        <div className="relative h-48 w-full">
          <img
            src={getImageUrl(coverImage)}
            alt={title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <CardContent className="p-4">
        <h3 className="text-xl font-bold mb-3">{title}</h3>
        <div
          className="prose prose-sm"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </CardContent>
    </Card>
  );
};
