"use client";

import { useState } from "react";
import { Star, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export default function ReviewSection({ product }) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    rating: 0,
    title: "",
    comment: "",
  });
  const [showForm, setShowForm] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const handleRatingClick = (rating) => {
    setReviewForm((prev) => ({ ...prev, rating }));
    if (formErrors.rating) {
      setFormErrors((prev) => ({ ...prev, rating: null }));
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setReviewForm((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const errors = {};

    if (reviewForm.rating === 0) {
      errors.rating = "Please select a rating";
    }

    if (!reviewForm.comment.trim()) {
      errors.comment = "Please provide a review comment";
    }

    if (reviewForm.title.trim() && reviewForm.title.trim().length < 3) {
      errors.title = "Title should be at least 3 characters";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();

    if (!isAuthenticated) {
      router.push(`/auth?redirect=/products/${product.slug}&review=true`);
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetchApi(`/users/reviews`, {
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          productId: product.id,
          rating: reviewForm.rating,
          title: reviewForm.title.trim() || "Review",
          comment: reviewForm.comment.trim(),
        }),
      });

      if (response.success) {
        toast.success("Review submitted successfully!");
        setReviewForm({ rating: 0, title: "", comment: "" });
        setShowForm(false);
        window.location.reload();
      } else {
        toast.error(response.message || "Failed to submit review");
      }
    } catch (error) {
      console.error("Error submitting review:", error);
      toast.error(error.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canReview = () => {
    return isAuthenticated;
  };

  const ReviewFormComponent = () => (
    <form onSubmit={handleReviewSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Rating <span className="text-red-500">*</span></label>
        <div className="flex justify-center">
          {[1, 2, 3, 4, 5].map((rating) => (
            <Star key={rating} className={`h-8 w-8 cursor-pointer ${formErrors.rating ? "text-red-200 hover:text-red-400" : "text-gray-300 hover:text-yellow-400"}`} fill={reviewForm.rating >= rating ? "#FBBF24" : "none"} onClick={() => handleRatingClick(rating)} />
          ))}
        </div>
        {formErrors.rating && <p className="text-sm text-red-500 mt-1 text-center">{formErrors.rating}</p>}
      </div>

      <div>
        <label htmlFor="title" className="block text-sm font-medium mb-2">Review Title</label>
        <input type="text" id="title" name="title" value={reviewForm.title} onChange={handleInputChange} className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${formErrors.title ? "border-red-500" : "border-gray-300"}`} placeholder="Give your review a title (optional)" />
        {formErrors.title && <p className="text-sm text-red-500 mt-1">{formErrors.title}</p>}
      </div>

      <div>
        <label htmlFor="comment" className="block text-sm font-medium mb-2">Review <span className="text-red-500">*</span></label>
        <textarea id="comment" name="comment" value={reviewForm.comment} onChange={handleInputChange} rows={4} className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${formErrors.comment ? "border-red-500" : "border-gray-300"}`} placeholder="Write your review here"></textarea>
        {formErrors.comment && <p className="text-sm text-red-500 mt-1">{formErrors.comment}</p>}
      </div>

      <div className="flex gap-3 justify-center">
        <Button type="submit" className="px-8 py-2 bg-primary hover:bg-primary/90 rounded-md" disabled={isSubmitting}>
          {isSubmitting ? (
            <div className="flex items-center">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Submitting...
            </div>
          ) : "Submit Review"}
        </Button>
        <Button type="button" variant="outline" onClick={() => { setShowForm(false); setFormErrors({}); setReviewForm({ rating: 0, title: "", comment: "" }); }} className="px-6 rounded-md">Cancel</Button>
      </div>
    </form>
  );

  return (
    <div>
      {product.reviews && product.reviews.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Customer Reviews</h3>
              <div className="flex items-center">
                <div className="flex text-yellow-400 mr-2">
                  {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4" fill={i < Math.round(product.avgRating || 0) ? "currentColor" : "none"} />)}
                </div>
                <span className="text-sm text-gray-500">Based on {product.reviewCount} reviews</span>
              </div>
            </div>

            <div className="space-y-8 max-h-[600px] overflow-y-auto pr-4">
              {product.reviews.map((review) => (
                <div key={review.id} className="border-b border-gray-200 pb-8">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-gray-800">{review.user.name}</p>
                      <div className="flex text-yellow-400 mt-1">
                        {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4" fill={i < review.rating ? "currentColor" : "none"} />)}
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">{new Date(review.createdAt).toLocaleDateString()}</span>
                  </div>

                  <h4 className="font-medium text-gray-800 mt-3">{review.title}</h4>
                  <p className="mt-2 text-gray-600 leading-relaxed">{review.comment}</p>

                  {review.adminReply && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-md">
                      <p className="text-sm font-semibold text-blue-700">Response from Seller:</p>
                      <p className="mt-1 text-sm text-gray-700">{review.adminReply}</p>
                      {review.adminReplyDate && <p className="mt-2 text-xs text-gray-500">Replied on {new Date(review.adminReplyDate).toLocaleDateString()}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 p-6 rounded-md">
            <h3 className="font-semibold text-lg mb-4">Write a Review</h3>

            {!showForm ? (
              <Button onClick={() => { if (!isAuthenticated) { router.push(`/auth?redirect=/products/${product.slug}&review=true`); return; } setShowForm(true); }} className="px-8 py-2 bg-primary hover:bg-primary/90 rounded-md">Write a Review</Button>
            ) : <ReviewFormComponent />}

            {!canReview() && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-700 text-sm flex items-center">
                <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                You need to purchase this product to write a review
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-500 mb-6">No reviews yet. Be the first to review this product!</p>
          <Button onClick={() => { if (!isAuthenticated) { router.push(`/auth?redirect=/products/${product.slug}&review=true`); return; } setShowForm(true); }} className="px-8 py-2 bg-primary hover:bg-primary/90 rounded-md">Write a Review</Button>

          {showForm && (
            <div className="max-w-lg mx-auto mt-8 p-6 bg-white rounded-lg shadow-sm border">
              <ReviewFormComponent />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
