
"use client";

import { useState } from "react";
import { Sparkles, Image as ImageIcon, Link as LinkIcon, Paperclip, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { aiAssistedPostDrafting } from "@/ai/flows/ai-assisted-post-drafting";
import { useToast } from "@/hooks/use-toast";

export function PostCreator() {
  const [content, setContent] = useState("");
  const [isDrafting, setIsDrafting] = useState(false);
  const { toast } = useToast();

  const handleAIDraft = async () => {
    if (!content && content.length < 5) {
      toast({
        title: "Context Needed",
        description: "Please type a few words about what you'd like to post.",
        variant: "destructive",
      });
      return;
    }

    setIsDrafting(true);
    try {
      const result = await aiAssistedPostDrafting({
        topic: content,
        tone: "professional",
        length: "medium"
      });
      setContent(result.draftedPost);
    } catch (error) {
      toast({
        title: "AI Drafting Failed",
        description: "Could not generate draft at this time.",
        variant: "destructive",
      });
    } finally {
      setIsDrafting(false);
    }
  };

  return (
    <Card className="p-4 shadow-sm">
      <div className="flex gap-4">
        <Avatar className="h-10 w-10">
          <AvatarImage src="https://picsum.photos/seed/user-me/200/200" />
          <AvatarFallback>SJ</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-3">
          <Textarea
            placeholder="Share an update or milestone..."
            className="min-h-[100px] bg-gray-50 border-none focus-visible:ring-1 focus-visible:ring-primary text-gray-900 resize-none rounded-xl"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="text-gray-500 hover:text-primary hover:bg-primary/10 rounded-full">
                <ImageIcon className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-gray-500 hover:text-primary hover:bg-primary/10 rounded-full">
                <Paperclip className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-gray-500 hover:text-primary hover:bg-primary/10 rounded-full">
                <LinkIcon className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="gap-2 border-primary text-primary hover:bg-primary/10 rounded-full"
                onClick={handleAIDraft}
                disabled={isDrafting}
              >
                <Sparkles className="h-4 w-4" />
                {isDrafting ? "Drafting..." : "Draft with AI"}
              </Button>
              <Button 
                className="bg-primary text-white hover:bg-primary/90 rounded-full px-6"
                disabled={!content.trim()}
              >
                Post
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
