import React, { useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Star, X, Plus, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface ImageData {
  url: string;
  id?: string;
  isPrimary?: boolean;
  file?: File;
  tempId?: string;
  isNew?: boolean;
}

interface ImageManagementDialogProps {
  images: ImageData[];
  onImagesChange: (images: ImageData[]) => void;
  triggerButton: React.ReactNode;
  title: string;
  maxImages?: number;
}

export default function ImageManagementDialog({
  images,
  onImagesChange,
  triggerButton,
  title,
  maxImages = 5,
}: ImageManagementDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) {
      toast.error("No valid files selected");
      return;
    }

    setIsUploading(true);

    try {
      // Validate files
      const validFiles = acceptedFiles.filter((file) => {
        const isValidType = file.type.startsWith("image/");
        const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB

        if (!isValidType) {
          toast.error(`${file.name} is not a valid image file`);
          return false;
        }
        if (!isValidSize) {
          toast.error(`${file.name} is too large. Maximum size is 10MB`);
          return false;
        }
        return true;
      });

      if (validFiles.length === 0) {
        setIsUploading(false);
        return;
      }

      // Check if adding these files would exceed maxImages
      if (images.length + validFiles.length > maxImages) {
        toast.error(
          `Cannot add ${validFiles.length} images. Maximum ${maxImages} images allowed.`
        );
        setIsUploading(false);
        return;
      }

      // Create new image data
      const newImages: ImageData[] = validFiles.map((file, index) => ({
        url: URL.createObjectURL(file),
        file,
        tempId: `temp-${Date.now()}-${index}-${Math.random()}`,
        isPrimary: images.length === 0 && index === 0, // First image is primary if no images exist
        isNew: true,
      }));

      // Update images array
      const updatedImages = [...images, ...newImages];
      onImagesChange(updatedImages);

      toast.success(`${validFiles.length} image(s) added successfully`);
    } catch (error) {
      console.error("Error adding images:", error);
      toast.error("Failed to add images");
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageRemove = (imageIndex: number) => {
    const imageToRemove = images[imageIndex];

    if (!imageToRemove) return;

    // Prevent removing the only image
    if (images.length === 1) {
      toast.error(
        "Cannot remove the only image. At least one image is required."
      );
      return;
    }

    // Clean up blob URL if it's a local image
    if (imageToRemove.url && imageToRemove.url.startsWith("blob:")) {
      URL.revokeObjectURL(imageToRemove.url);
    }

    // Remove from images array
    const updatedImages = images.filter((_, i) => i !== imageIndex);

    // If we removed the primary image, set the first remaining as primary
    if (imageToRemove.isPrimary && updatedImages.length > 0) {
      updatedImages[0].isPrimary = true;
    }

    onImagesChange(updatedImages);
    toast.success("Image removed successfully");
  };

  const handleSetPrimary = (imageIndex: number) => {
    // Update images with new primary
    const updatedImages = images.map((img, i) => ({
      ...img,
      isPrimary: i === imageIndex,
    }));

    onImagesChange(updatedImages);
    toast.success("Primary image updated");
  };

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      onDrop: handleImageUpload,
      accept: {
        "image/jpeg": [],
        "image/png": [],
        "image/webp": [],
        "image/gif": [],
      },
      maxSize: 10 * 1024 * 1024, // 10MB
      multiple: true,
      onDropRejected: (rejectedFiles) => {
        rejectedFiles.forEach((file) => {
          const errors = file.errors.map((e) => e.message).join(", ");
          toast.error(`${file.file.name}: ${errors}`);
        });
      },
    });

  const remainingSlots = maxImages - images.length;
  const hasImages = images.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{triggerButton}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            {title}
            <Badge variant="outline" className="ml-2">
              {images.length}/{maxImages}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Upload Area */}
          {remainingSlots > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Add Images</Label>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${isDragActive
                    ? isDragReject
                      ? "border-red-400 bg-red-50"
                      : "border-blue-400 bg-blue-50"
                    : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                  } ${isUploading ? "opacity-50 pointer-events-none" : ""}`}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center space-y-3">
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gray-100">
                    {isUploading ? (
                      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Plus className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {isUploading
                        ? "Uploading..."
                        : isDragActive
                          ? isDragReject
                            ? "Some files are not supported"
                            : "Drop images here"
                          : "Drag and drop images or click to browse"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      JPG, PNG, WebP, GIF (max 10MB each) • {remainingSlots}{" "}
                      slots remaining
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Images Grid */}
          {hasImages && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Uploaded Images ({images.length})
              </Label>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {images.map((image, index) => (
                  <div
                    key={image.id || image.tempId || index}
                    className={`relative group aspect-square rounded-lg overflow-hidden border-2 transition-all ${image.isPrimary
                        ? "border-green-500 ring-2 ring-green-200 shadow-lg"
                        : "border-gray-200 hover:border-gray-300"
                      }`}
                  >
                    <div className="h-full w-full bg-white flex items-center justify-center">
                      {image.url ? (
                        <img
                          src={image.url}
                          alt={`Image ${index + 1}`}
                          className="h-full w-full object-contain p-1"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = "none";
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = `
                                <div class="flex flex-col items-center justify-center h-full text-gray-400">
                                  <svg class="h-8 w-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                  </svg>
                                  <span class="text-xs">Failed to load</span>
                                </div>
                              `;
                            }
                          }}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                          <ImageIcon className="h-8 w-8 mb-2" />
                          <span className="text-xs">No image</span>
                        </div>
                      )}
                    </div>

                    {/* Primary Badge */}
                    {image.isPrimary && (
                      <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full font-medium">
                        PRIMARY
                      </div>
                    )}

                    {/* New Badge */}
                    {image.isNew && (
                      <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                        NEW
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center">
                      <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!image.isPrimary && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => handleSetPrimary(index)}
                            className="h-8 w-8 p-0"
                          >
                            <Star className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => handleImageRemove(index)}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Images State */}
          {!hasImages && (
            <div className="text-center py-8 text-gray-500 border border-gray-200 rounded-lg bg-gray-50">
              <ImageIcon className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p className="font-medium">No images uploaded yet</p>
              <p className="text-sm mt-1">Upload images using the area above</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
