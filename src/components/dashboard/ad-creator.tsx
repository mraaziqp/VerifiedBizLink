"use client";

import { useState } from "react";
import { ChevronRight, Upload, MapPin, Clock, Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type AdStep = "title" | "description" | "location" | "duration" | "review";

export default function AdCreator() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<AdStep>("title");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    radius: 500,
    duration: 30,
    imageUrl: "",
  });
  const [loading, setLoading] = useState(false);

  const steps: { id: AdStep; label: string; icon: any }[] = [
    { id: "title", label: "Title", icon: null },
    { id: "description", label: "Details", icon: null },
    { id: "location", label: "Location", icon: MapPin },
    { id: "duration", label: "Duration", icon: Clock },
    { id: "review", label: "Review", icon: Sparkles },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  const handleNext = () => {
    if (currentStep === "title" && !formData.title) return;
    if (currentStep === "description" && !formData.description) return;

    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].id);
    }
  };

  const handlePrev = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].id);
    }
  };

  const handleCreate = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/ads/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          duration: parseInt(formData.duration.toString()),
          radius: parseInt(formData.radius.toString()),
        }),
      });

      if (res.ok) {
        setIsOpen(false);
        setFormData({
          title: "",
          description: "",
          location: "",
          radius: 500,
          duration: 30,
          imageUrl: "",
        });
        setCurrentStep("title");
      }
    } catch (error) {
      console.error("Error creating ad:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Empty State */}
      <div className="rounded-2xl bg-gradient-to-br from-gray-800/40 to-gray-900/40 border-2 border-dashed border-gray-700/50 p-12 text-center">
        <Sparkles className="h-12 w-12 mx-auto text-gray-600 mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">No ads yet</h3>
        <p className="text-gray-400 mb-6">Create your first ad in 2 minutes</p>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="bg-yellow-400 text-gray-900 hover:bg-yellow-300 py-6 px-8 text-lg font-semibold">
              <Sparkles className="mr-2 h-5 w-5" />
              Create Your First Ad
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-2xl bg-gradient-to-br from-gray-900 to-gray-950 border-gray-800">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-white">Create New Ad</DialogTitle>
            </DialogHeader>

            {/* Progress Bar */}
            <div className="flex gap-2 mb-6">
              {steps.map((step, idx) => (
                <div
                  key={step.id}
                  className={`flex-1 h-2 rounded-full transition-all ${
                    idx < currentStepIndex
                      ? "bg-green-500"
                      : idx === currentStepIndex
                      ? "bg-yellow-400"
                      : "bg-gray-700"
                  }`}
                />
              ))}
            </div>

            {/* Step: Title */}
            {currentStep === "title" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Ad Title</label>
                  <Input
                    placeholder="e.g., Summer Sale 50% Off"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="bg-gray-800/50 border-gray-700 text-white placeholder-gray-500"
                  />
                  <p className="text-xs text-gray-500 mt-2">Make it catchy and clear (max 50 characters)</p>
                </div>
              </div>
            )}

            {/* Step: Description */}
            {currentStep === "description" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">What are you offering?</label>
                  <Textarea
                    placeholder="Describe your offer, discount, or promotion. Include details like price, validity, and any terms."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={5}
                    className="bg-gray-800/50 border-gray-700 text-white placeholder-gray-500"
                  />
                  <p className="text-xs text-gray-500 mt-2">Be detailed - this helps users decide to engage</p>
                </div>
              </div>
            )}

            {/* Step: Location */}
            {currentStep === "location" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Where should this appear?</label>
                  <Input
                    placeholder="e.g., Cape Town, South Africa"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="bg-gray-800/50 border-gray-700 text-white placeholder-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Radius: {formData.radius}m</label>
                  <input
                    type="range"
                    min="100"
                    max="5000"
                    step="100"
                    value={formData.radius}
                    onChange={(e) => setFormData({ ...formData, radius: parseInt(e.target.value) })}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    People within this radius will see your ad (100m - 5km)
                  </p>
                </div>
              </div>
            )}

            {/* Step: Duration */}
            {currentStep === "duration" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">How long should this run?</label>
                  <select
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                    className="w-full bg-gray-800/50 border border-gray-700 text-white rounded px-3 py-2"
                  >
                    <option value={7}>1 Week - $10</option>
                    <option value={14}>2 Weeks - $18</option>
                    <option value={30}>30 Days - $35</option>
                    <option value={60}>60 Days - $65</option>
                    <option value={90}>90 Days - $90</option>
                  </select>
                </div>

                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                  <p className="text-sm text-blue-300">
                    💡 <strong>Tip:</strong> Longer durations get better visibility. Start with 30 days to test.
                  </p>
                </div>
              </div>
            )}

            {/* Step: Review */}
            {currentStep === "review" && (
              <div className="space-y-4">
                <div className="p-6 rounded-lg bg-gray-800/50 border border-gray-700/50 space-y-4">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Ad Title</p>
                    <p className="text-lg font-bold text-white">{formData.title}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-400 mb-1">Description</p>
                    <p className="text-white whitespace-pre-wrap">{formData.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-700">
                    <div>
                      <p className="text-sm text-gray-400">Location</p>
                      <p className="text-white">{formData.location} ({formData.radius}m)</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Duration</p>
                      <p className="text-white">{formData.duration} days</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                  <p className="text-sm text-green-300">
                    ✓ Ready to publish! Your ad will appear immediately to nearby users.
                  </p>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={handlePrev}
                disabled={currentStepIndex === 0}
                className="flex-1 text-gray-400 border-gray-700 hover:border-gray-600"
              >
                Back
              </Button>

              {currentStep !== "review" ? (
                <Button
                  onClick={handleNext}
                  disabled={
                    (currentStep === "title" && !formData.title) ||
                    (currentStep === "description" && !formData.description)
                  }
                  className="flex-1 bg-yellow-400 text-gray-900 hover:bg-yellow-300 gap-2"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleCreate}
                  disabled={loading}
                  className="flex-1 bg-green-500 text-white hover:bg-green-600"
                >
                  {loading ? "Publishing..." : "Publish Ad"}
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
