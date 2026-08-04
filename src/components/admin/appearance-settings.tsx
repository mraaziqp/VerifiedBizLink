"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Loader2, Save, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ImageUploader } from "@/components/media/image-uploader";

export default function AppearanceSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [heroImageUrl, setHeroImageUrl] = useState("/hero-cape-town.jpg");
  const [opacity, setOpacity] = useState(0.16);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/site-settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.heroImageUrl) setHeroImageUrl(data.heroImageUrl);
        if (typeof data?.heroOpacity === "number") setOpacity(data.heroOpacity);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/site-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ heroImageUrl, heroOpacity: opacity }),
      });
      if (res.ok) {
        toast({ title: "Homepage appearance updated" });
      } else {
        toast({ title: "Could not save appearance settings", variant: "destructive" });
      }
    } catch {
      toast({ title: "Could not save appearance settings", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-700 mx-auto" />
        <p className="text-gray-500 mt-4">Loading appearance settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Homepage Appearance</h2>
        <p className="text-gray-500 text-sm mt-1">
          Change the faded background image on the home page and how strongly it shows through.
        </p>
      </div>

      <Card className="bg-white/80 border-cyan-500/20 p-6 space-y-6">
        <div>
          <label className="text-sm text-gray-700 font-semibold block mb-2">Background Image</label>
          <div className="flex items-center gap-4">
            <div className="w-40 h-24 rounded-lg overflow-hidden border border-gray-200 bg-gray-100 shrink-0">
              <img src={heroImageUrl} alt="Current hero" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col gap-2">
              <ImageUploader
                onImageSelect={(url) => setHeroImageUrl(url)}
                onUploadStateChange={setUploading}
                buttonClassName="border border-gray-200 bg-gray-100 text-gray-700 hover:text-cyan-700"
              />
              <p className="text-xs text-gray-500">{uploading ? "Uploading…" : "Upload a new image to replace it"}</p>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-gray-700 font-semibold">Opacity</label>
            <span className="text-cyan-700 font-mono text-sm">{Math.round(opacity * 100)}%</span>
          </div>
          <Slider
            value={[opacity]}
            onValueChange={([v]) => setOpacity(v)}
            min={0}
            max={0.6}
            step={0.01}
            className="max-w-md"
          />
          <p className="text-xs text-gray-500 mt-2">Higher values make the background more visible; keep it low enough that text stays readable.</p>
        </div>

        <div>
          <label className="text-sm text-gray-700 font-semibold block mb-2 flex items-center gap-2">
            <ImageIcon className="h-4 w-4" /> Live Preview
          </label>
          <div className="relative h-32 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url('${heroImageUrl}')`, opacity }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-gray-50/60 via-gray-50/40 to-gray-50" />
            <div className="relative h-full flex items-center justify-center text-gray-900 font-bold text-sm">
              Sample homepage text over the background
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving || uploading} className="gap-2 bg-cyan-600 hover:bg-cyan-700 text-white">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Appearance
          </Button>
        </div>
      </Card>
    </div>
  );
}
