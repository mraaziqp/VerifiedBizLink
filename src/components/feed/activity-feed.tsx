
"use client";

import { ThumbsUp, MessageSquare, Share2, MoreHorizontal } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { GoldCheckmark } from "@/components/ui/gold-checkmark";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const POSTS = [
  {
    id: 1,
    author: "Elena Petrova",
    company: "Arctic Logistics",
    avatar: "https://picsum.photos/seed/user-4/200/200",
    time: "2h ago",
    content: "We're thrilled to announce our expansion into the Nordic market! This move allows us to provide even more efficient supply chain solutions to our B2B partners across Europe. Looking forward to new collaborations.",
    likes: 42,
    comments: 12
  },
  {
    id: 2,
    author: "Marcus Thorne",
    company: "Thorne Capital",
    avatar: "https://picsum.photos/seed/user-5/200/200",
    time: "5h ago",
    content: "Integrity is the bedrock of business. Our recent audit confirmed our commitment to 100% transparent operations. Trust is something we build every single day.",
    likes: 128,
    comments: 24
  },
  {
    id: 3,
    author: "Jin Woo",
    company: "Quantum Cyber",
    avatar: "https://picsum.photos/seed/user-6/200/200",
    time: "8h ago",
    content: "New whitepaper alert! 🚀 We've just published our findings on B2B security trends for 2025. Download your copy to see how the landscape is shifting.",
    likes: 89,
    comments: 5
  }
];

export function ActivityFeed() {
  return (
    <div className="flex flex-col gap-6">
      {POSTS.map((post) => (
        <Card key={post.id} className="shadow-sm border-none overflow-hidden hover:shadow-md transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 ring-2 ring-primary/10">
                <AvatarImage src={post.avatar} />
                <AvatarFallback>{post.author[0]}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-gray-900">{post.author}</span>
                  <GoldCheckmark />
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                  <span>{post.company}</span>
                  <span className="text-gray-300">•</span>
                  <span>{post.time}</span>
                </div>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="text-gray-400 rounded-full hover:bg-gray-100">
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </CardHeader>
          <CardContent className="pb-4">
            <p className="text-gray-700 leading-relaxed text-[15px]">{post.content}</p>
          </CardContent>
          <CardFooter className="flex flex-col pt-0">
            <div className="flex items-center justify-between w-full pb-3 text-xs text-gray-500 font-medium px-1">
              <div className="flex items-center gap-1 hover:text-primary cursor-pointer transition-colors">
                <div className="bg-primary/10 p-1 rounded-full">
                   <ThumbsUp className="h-3 w-3 text-primary fill-primary" />
                </div>
                <span>{post.likes} Likes</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="hover:text-primary cursor-pointer">{post.comments} Comments</span>
                <span className="hover:text-primary cursor-pointer">12 Shares</span>
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-3 gap-1 pt-2">
              <Button variant="ghost" className="gap-2 text-gray-600 hover:text-primary hover:bg-primary/5 transition-all">
                <ThumbsUp className="h-4 w-4" />
                <span>Like</span>
              </Button>
              <Button variant="ghost" className="gap-2 text-gray-600 hover:text-primary hover:bg-primary/5 transition-all">
                <MessageSquare className="h-4 w-4" />
                <span>Comment</span>
              </Button>
              <Button variant="ghost" className="gap-2 text-gray-600 hover:text-primary hover:bg-primary/5 transition-all">
                <Share2 className="h-4 w-4" />
                <span>Share</span>
              </Button>
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
