'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Upload, Loader2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { ImageUploader } from '@/components/media/image-uploader';

export default function BusinessGalleryPage() {
  const [images, setImages] = useState<Array<{id: string; url: string; title: string}>>([]);
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = (url: string) => {
    setImages([...images, { id: Date.now().toString(), url, title: 'New Image' }]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Link href="/business/dashboard" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Business Gallery</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <ImageUploader
                onImageSelect={handleImageUpload}
                buttonClassName="w-full"
              />
              <p className="text-sm text-gray-600">Upload photos of your business, products, and services</p>
            </div>
          </CardContent>
        </Card>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {images.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center">
                <p className="text-gray-500">No images yet. Upload your first business photo!</p>
              </CardContent>
            </Card>
          ) : (
            images.map(img => (
              <Card key={img.id} className="overflow-hidden">
                <div className="aspect-square bg-gray-200 overflow-hidden">
                  <img src={img.url} alt={img.title} className="w-full h-full object-cover" />
                </div>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <input
                      type="text"
                      value={img.title}
                      onChange={(e) => {
                        setImages(images.map(i => i.id === img.id ? { ...i, title: e.target.value } : i));
                      }}
                      className="text-sm font-medium border-0 focus:outline-none flex-1"
                      placeholder="Image title"
                    />
                    <button className="text-red-600 hover:text-red-700">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
