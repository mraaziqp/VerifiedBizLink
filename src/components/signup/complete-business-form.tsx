"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChevronRight, Plus, X, Loader2 } from "lucide-react";

const SOUTH_AFRICAN_PROVINCES = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "Northern Cape",
  "North West",
  "Western Cape",
];

const BUSINESS_CATEGORIES = [
  "Consulting",
  "Retail",
  "Services",
  "Manufacturing",
  "Technology",
  "Healthcare",
  "Finance",
  "Education",
  "Real Estate",
  "Construction",
  "Hospitality",
  "Other",
];

export default function CompleteBusinessForm() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Step 1: Business Details
    businessName: "",
    businessCategory: "",
    businessDescription: "",
    businessWebsite: "",
    businessPhone: "",
    businessEmail: "",

    // Step 2: Location & Service Areas
    primaryLocation: "",
    primaryProvince: "",
    serviceAreas: [] as string[],
    serviceAreaInput: "",
    serviceRadius: 50,

    // Step 3: Products & Services
    productsServices: [] as string[],
    productInput: "",

    // Step 4: Account Details
    accountEmail: "",
    accountPassword: "",
    accountConfirmPassword: "",
    agreeTerms: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validation functions
  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.businessName) newErrors.businessName = "Business name required";
    if (!formData.businessCategory) newErrors.businessCategory = "Category required";
    if (!formData.businessEmail) newErrors.businessEmail = "Business email required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.primaryLocation) newErrors.primaryLocation = "City required";
    if (!formData.primaryProvince) newErrors.primaryProvince = "Province required";
    if (formData.serviceAreas.length === 0) newErrors.serviceAreas = "Add at least one service area";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors: Record<string, string> = {};
    if (formData.productsServices.length === 0) newErrors.productsServices = "Add at least one product/service";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep4 = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.accountEmail) newErrors.accountEmail = "Email required";
    if (!formData.accountPassword) newErrors.accountPassword = "Password required";
    if (formData.accountPassword !== formData.accountConfirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    if (formData.accountPassword.length < 8) newErrors.accountPassword = "Password must be 8+ characters";
    if (!formData.agreeTerms) newErrors.agreeTerms = "Accept terms to continue";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddServiceArea = () => {
    if (formData.serviceAreaInput.trim() && !formData.serviceAreas.includes(formData.serviceAreaInput.trim())) {
      setFormData({
        ...formData,
        serviceAreas: [...formData.serviceAreas, formData.serviceAreaInput.trim()],
        serviceAreaInput: "",
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
    if (formData.productInput.trim() && !formData.productsServices.includes(formData.productInput.trim())) {
      setFormData({
        ...formData,
        productsServices: [...formData.productsServices, formData.productInput.trim()],
        productInput: "",
      });
    }
  };

  const handleRemoveProduct = (index: number) => {
    setFormData({
      ...formData,
      productsServices: formData.productsServices.filter((_, i) => i !== index),
    });
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    if (step === 3 && !validateStep3()) return;
    if (step < 4) setStep(step + 1);
  };

  const handleSubmit = async () => {
    if (!validateStep4()) return;

    try {
      setLoading(true);
      const response = await fetch("/api/auth/business-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: formData.businessName,
          businessCategory: formData.businessCategory,
          businessDescription: formData.businessDescription,
          businessWebsite: formData.businessWebsite,
          businessPhone: formData.businessPhone,
          businessEmail: formData.businessEmail,
          primaryLocation: formData.primaryLocation,
          primaryProvince: formData.primaryProvince,
          serviceAreas: formData.serviceAreas,
          serviceRadius: formData.serviceRadius,
          productsServices: formData.productsServices,
          email: formData.accountEmail,
          password: formData.accountPassword,
        }),
      });

      if (response.ok) {
        // Redirect to verification page
        window.location.href = "/verification-pending";
      } else {
        const error = await response.json();
        setErrors({ submit: error.message || "Signup failed" });
      }
    } catch (error) {
      setErrors({ submit: "An error occurred. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-2">Get Verified</h1>
          <p className="text-gray-400">Complete all steps to get your business verified</p>

          {/* Progress Bar */}
          <div className="mt-6 flex gap-2">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-2 flex-1 rounded-full transition-all ${
                  s <= step ? "bg-gradient-to-r from-cyan-500 to-purple-500" : "bg-gray-700"
                }`}
              />
            ))}
          </div>
          <p className="text-gray-400 text-sm mt-4">Step {step} of 4</p>
        </div>

        {/* Form Container */}
        <div className="rounded-3xl bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-cyan-500/20 backdrop-blur-xl p-8 shadow-2xl">
          {/* STEP 1: Business Details */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-6">Business Details</h2>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Business Name *</label>
                <Input
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  placeholder="e.g., ABC Consulting Ltd"
                  className="bg-gray-800/50 border-cyan-500/20 text-white placeholder:text-gray-500"
                />
                {errors.businessName && <p className="text-red-400 text-sm mt-1">{errors.businessName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Business Category *</label>
                <select
                  value={formData.businessCategory}
                  onChange={(e) => setFormData({ ...formData, businessCategory: e.target.value })}
                  className="w-full bg-gray-800/50 border border-cyan-500/20 text-white rounded-lg px-4 py-2"
                >
                  <option value="">Select a category</option>
                  {BUSINESS_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                {errors.businessCategory && <p className="text-red-400 text-sm mt-1">{errors.businessCategory}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Business Description</label>
                <Textarea
                  value={formData.businessDescription}
                  onChange={(e) => setFormData({ ...formData, businessDescription: e.target.value })}
                  placeholder="Tell us about your business..."
                  rows={4}
                  className="bg-gray-800/50 border-cyan-500/20 text-white placeholder:text-gray-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Business Email *</label>
                  <Input
                    type="email"
                    value={formData.businessEmail}
                    onChange={(e) => setFormData({ ...formData, businessEmail: e.target.value })}
                    placeholder="business@company.com"
                    className="bg-gray-800/50 border-cyan-500/20 text-white"
                  />
                  {errors.businessEmail && <p className="text-red-400 text-sm mt-1">{errors.businessEmail}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
                  <Input
                    value={formData.businessPhone}
                    onChange={(e) => setFormData({ ...formData, businessPhone: e.target.value })}
                    placeholder="+27 1234 5678"
                    className="bg-gray-800/50 border-cyan-500/20 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Website</label>
                <Input
                  value={formData.businessWebsite}
                  onChange={(e) => setFormData({ ...formData, businessWebsite: e.target.value })}
                  placeholder="https://www.yoursite.com"
                  className="bg-gray-800/50 border-cyan-500/20 text-white"
                />
              </div>

              <Button
                onClick={handleNext}
                className="w-full bg-gradient-to-r from-cyan-500 to-cyan-600 text-white hover:from-cyan-600 hover:to-cyan-700 py-3 gap-2"
              >
                Next: Location <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* STEP 2: Location & Service Areas */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-6">Location & Service Areas</h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">City/Location *</label>
                  <Input
                    value={formData.primaryLocation}
                    onChange={(e) => setFormData({ ...formData, primaryLocation: e.target.value })}
                    placeholder="e.g., Cape Town"
                    className="bg-gray-800/50 border-cyan-500/20 text-white"
                  />
                  {errors.primaryLocation && <p className="text-red-400 text-sm mt-1">{errors.primaryLocation}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Province *</label>
                  <select
                    value={formData.primaryProvince}
                    onChange={(e) => setFormData({ ...formData, primaryProvince: e.target.value })}
                    className="w-full bg-gray-800/50 border border-cyan-500/20 text-white rounded-lg px-4 py-2"
                  >
                    <option value="">Select province</option>
                    {SOUTH_AFRICAN_PROVINCES.map((prov) => (
                      <option key={prov} value={prov}>{prov}</option>
                    ))}
                  </select>
                  {errors.primaryProvince && <p className="text-red-400 text-sm mt-1">{errors.primaryProvince}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Service Radius (km)</label>
                <input
                  type="range"
                  min="5"
                  max="500"
                  step="5"
                  value={formData.serviceRadius}
                  onChange={(e) => setFormData({ ...formData, serviceRadius: parseInt(e.target.value) })}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <p className="text-gray-400 text-sm mt-2">Service within {formData.serviceRadius} km</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Areas You Service *</label>
                <div className="flex gap-2 mb-3">
                  <Input
                    value={formData.serviceAreaInput}
                    onChange={(e) => setFormData({ ...formData, serviceAreaInput: e.target.value })}
                    placeholder="e.g., Johannesburg, Pretoria"
                    className="bg-gray-800/50 border-cyan-500/20 text-white"
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddServiceArea();
                      }
                    }}
                  />
                  <Button
                    onClick={handleAddServiceArea}
                    className="bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  {formData.serviceAreas.map((area, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-gray-800/30 border border-cyan-500/20 rounded-lg"
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
                {errors.serviceAreas && <p className="text-red-400 text-sm mt-1">{errors.serviceAreas}</p>}
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setStep(1)}
                  variant="outline"
                  className="flex-1 border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10"
                >
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white hover:from-cyan-600 hover:to-cyan-700 gap-2"
                >
                  Next: Products <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: Products & Services */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-6">Products & Services</h2>
              <p className="text-gray-400">Help customers find you by listing what you offer</p>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Add Products/Services *</label>
                <div className="flex gap-2 mb-3">
                  <Input
                    value={formData.productInput}
                    onChange={(e) => setFormData({ ...formData, productInput: e.target.value })}
                    placeholder="e.g., Web Development, Branding"
                    className="bg-gray-800/50 border-cyan-500/20 text-white"
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddProduct();
                      }
                    }}
                  />
                  <Button
                    onClick={handleAddProduct}
                    className="bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  {formData.productsServices.map((product, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-gray-800/30 border border-cyan-500/20 rounded-lg"
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
                {errors.productsServices && <p className="text-red-400 text-sm mt-1">{errors.productsServices}</p>}
              </div>

              <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
                <p className="text-cyan-300 text-sm">💡 Tip: Add specific, searchable terms like "Web Design", "Tax Consultation", etc.</p>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setStep(2)}
                  variant="outline"
                  className="flex-1 border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10"
                >
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white hover:from-cyan-600 hover:to-cyan-700 gap-2"
                >
                  Next: Account <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: Account Details */}
          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-6">Create Account</h2>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email *</label>
                <Input
                  type="email"
                  value={formData.accountEmail}
                  onChange={(e) => setFormData({ ...formData, accountEmail: e.target.value })}
                  placeholder="your@email.com"
                  className="bg-gray-800/50 border-cyan-500/20 text-white"
                />
                {errors.accountEmail && <p className="text-red-400 text-sm mt-1">{errors.accountEmail}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Password *</label>
                <Input
                  type="password"
                  value={formData.accountPassword}
                  onChange={(e) => setFormData({ ...formData, accountPassword: e.target.value })}
                  placeholder="Min. 8 characters"
                  className="bg-gray-800/50 border-cyan-500/20 text-white"
                />
                {errors.accountPassword && <p className="text-red-400 text-sm mt-1">{errors.accountPassword}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Confirm Password *</label>
                <Input
                  type="password"
                  value={formData.accountConfirmPassword}
                  onChange={(e) => setFormData({ ...formData, accountConfirmPassword: e.target.value })}
                  placeholder="Confirm your password"
                  className="bg-gray-800/50 border-cyan-500/20 text-white"
                />
                {errors.confirmPassword && <p className="text-red-400 text-sm mt-1">{errors.confirmPassword}</p>}
              </div>

              <div className="flex items-start gap-3 p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
                <input
                  type="checkbox"
                  checked={formData.agreeTerms}
                  onChange={(e) => setFormData({ ...formData, agreeTerms: e.target.checked })}
                  className="w-4 h-4 mt-1"
                />
                <p className="text-gray-300 text-sm">
                  I agree to the Terms of Service and Privacy Policy. Your business will be verified with CIPC and SARS.
                </p>
              </div>
              {errors.agreeTerms && <p className="text-red-400 text-sm">{errors.agreeTerms}</p>}

              {errors.submit && <p className="text-red-400 text-sm">{errors.submit}</p>}

              <div className="flex gap-3">
                <Button
                  onClick={() => setStep(3)}
                  variant="outline"
                  className="flex-1 border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10"
                >
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white hover:from-cyan-600 hover:to-cyan-700 gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      Get Verified <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
