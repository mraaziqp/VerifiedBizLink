"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, X } from "lucide-react";

export default function BusinessSignupForm() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Business Details
    businessName: "",
    businessType: "",
    description: "",
    phone: "",
    email: "",
    website: "",

    // Location
    primaryLocation: "",
    serviceAreas: [] as string[],
    areaInput: "",

    // Products & Services
    products: [] as string[],
    productInput: "",

    // Account
    password: "",
    confirmPassword: "",
  });

  const handleAddServiceArea = () => {
    if (formData.areaInput.trim()) {
      setFormData({
        ...formData,
        serviceAreas: [...formData.serviceAreas, formData.areaInput.trim()],
        areaInput: "",
      });
    }
  };

  const handleRemoveServiceArea = (index: number) => {
    setFormData({
      ...formData,
      serviceAreas: formData.serviceAreas.filter((_, i) => i !== index),
    });
  };

  const handleAddProduct = () => {
    if (formData.productInput.trim()) {
      setFormData({
        ...formData,
        products: [...formData.products, formData.productInput.trim()],
        productInput: "",
      });
    }
  };

  const handleRemoveProduct = (index: number) => {
    setFormData({
      ...formData,
      products: formData.products.filter((_, i) => i !== index),
    });
  };

  const handleSignup = async () => {
    if (
      !formData.businessName ||
      !formData.email ||
      !formData.password ||
      !formData.primaryLocation ||
      formData.serviceAreas.length === 0 ||
      formData.products.length === 0
    ) {
      alert("Please fill in all required fields");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          businessName: formData.businessName,
          businessType: formData.businessType,
          description: formData.description,
          phone: formData.phone,
          website: formData.website,
          primaryLocation: formData.primaryLocation,
          serviceAreas: formData.serviceAreas,
          products: formData.products,
        }),
      });

      if (res.ok) {
        // Redirect to dashboard or verification page
        window.location.href = "/dashboard";
      } else {
        const error = await res.json();
        alert(error.message || "Signup failed");
      }
    } catch (error) {
      console.error("Signup error:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between mb-4">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-2 flex-1 rounded-full mx-1 transition-all ${
                s <= step ? "bg-yellow-400" : "bg-gray-700"
              }`}
            />
          ))}
        </div>
        <p className="text-gray-400 text-sm">
          Step {step} of 4
        </p>
      </div>

      {/* Step 1: Business Details */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Business Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Business Name *
                </label>
                <Input
                  value={formData.businessName}
                  onChange={(e) =>
                    setFormData({ ...formData, businessName: e.target.value })
                  }
                  placeholder="e.g., ABC Consulting"
                  className="bg-gray-800/50 border-gray-700 text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Business Type
                </label>
                <select
                  value={formData.businessType}
                  onChange={(e) =>
                    setFormData({ ...formData, businessType: e.target.value })
                  }
                  className="w-full bg-gray-800/50 border border-gray-700 text-white rounded px-3 py-2"
                >
                  <option value="">Select a category</option>
                  <option value="consulting">Consulting</option>
                  <option value="retail">Retail</option>
                  <option value="services">Services</option>
                  <option value="manufacturing">Manufacturing</option>
                  <option value="technology">Technology</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Tell us about your business"
                  rows={4}
                  className="bg-gray-800/50 border-gray-700 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Phone
                  </label>
                  <Input
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="+27 1234 5678"
                    className="bg-gray-800/50 border-gray-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Website
                  </label>
                  <Input
                    value={formData.website}
                    onChange={(e) =>
                      setFormData({ ...formData, website: e.target.value })
                    }
                    placeholder="www.yourbusiness.com"
                    className="bg-gray-800/50 border-gray-700 text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          <Button
            onClick={() => setStep(2)}
            className="w-full bg-yellow-400 text-gray-900 hover:bg-yellow-300"
          >
            Next: Location
          </Button>
        </div>
      )}

      {/* Step 2: Location & Service Areas */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">
              Location & Service Areas
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Primary Location * (City/Province)
                </label>
                <Input
                  value={formData.primaryLocation}
                  onChange={(e) =>
                    setFormData({ ...formData, primaryLocation: e.target.value })
                  }
                  placeholder="e.g., Cape Town, Western Cape"
                  className="bg-gray-800/50 border-gray-700 text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Areas You Service * (Add multiple areas)
                </label>
                <div className="flex gap-2 mb-3">
                  <Input
                    value={formData.areaInput}
                    onChange={(e) =>
                      setFormData({ ...formData, areaInput: e.target.value })
                    }
                    placeholder="e.g., Johannesburg, Pretoria"
                    className="bg-gray-800/50 border-gray-700 text-white"
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddServiceArea();
                      }
                    }}
                  />
                  <Button
                    onClick={handleAddServiceArea}
                    className="bg-yellow-400 text-gray-900 hover:bg-yellow-300"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  {formData.serviceAreas.map((area, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-gray-800/30 border border-gray-700/30 rounded"
                    >
                      <span className="text-white">{area}</span>
                      <button
                        onClick={() => handleRemoveServiceArea(idx)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => setStep(1)}
              variant="outline"
              className="flex-1 border-gray-700 text-white"
            >
              Back
            </Button>
            <Button
              onClick={() => setStep(3)}
              className="flex-1 bg-yellow-400 text-gray-900 hover:bg-yellow-300"
            >
              Next: Products & Services
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Products & Services */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">
              Products & Services
            </h2>
            <p className="text-gray-400 text-sm mb-4">
              Add what you offer so customers can find you easier
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Add Products/Services * (Add at least one)
                </label>
                <div className="flex gap-2 mb-3">
                  <Input
                    value={formData.productInput}
                    onChange={(e) =>
                      setFormData({ ...formData, productInput: e.target.value })
                    }
                    placeholder="e.g., Web Development, Logo Design"
                    className="bg-gray-800/50 border-gray-700 text-white"
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddProduct();
                      }
                    }}
                  />
                  <Button
                    onClick={handleAddProduct}
                    className="bg-yellow-400 text-gray-900 hover:bg-yellow-300"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  {formData.products.map((product, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-gray-800/30 border border-gray-700/30 rounded"
                    >
                      <span className="text-white">{product}</span>
                      <button
                        onClick={() => handleRemoveProduct(idx)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => setStep(2)}
              variant="outline"
              className="flex-1 border-gray-700 text-white"
            >
              Back
            </Button>
            <Button
              onClick={() => setStep(4)}
              className="flex-1 bg-yellow-400 text-gray-900 hover:bg-yellow-300"
            >
              Next: Create Account
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Account */}
      {step === 4 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Create Account</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email *
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="you@business.com"
                  className="bg-gray-800/50 border-gray-700 text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Password *
                </label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="Min. 8 characters"
                  className="bg-gray-800/50 border-gray-700 text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Confirm Password *
                </label>
                <Input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      confirmPassword: e.target.value,
                    })
                  }
                  placeholder="Confirm your password"
                  className="bg-gray-800/50 border-gray-700 text-white"
                />
              </div>

              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <p className="text-sm text-blue-300">
                  ✓ Your business will be verified with CIPC and SARS within 24-48 hours
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => setStep(3)}
              variant="outline"
              className="flex-1 border-gray-700 text-white"
            >
              Back
            </Button>
            <Button
              onClick={handleSignup}
              disabled={loading}
              className="flex-1 bg-yellow-400 text-gray-900 hover:bg-yellow-300"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating Account...
                </>
              ) : (
                "Create Account & Get Verified"
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
