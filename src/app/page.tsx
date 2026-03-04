
import { SidebarLeft } from "@/components/layout/sidebar-left";
import { ActivityFeed } from "@/components/feed/activity-feed";
import { PostCreator } from "@/components/feed/post-creator";
import { ConnectionDiscovery } from "@/components/widgets/connection-discovery";
import { ComplianceNews } from "@/components/widgets/compliance-news";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          
          {/* Left Column - Navigation & Identity (col-span-3) */}
          <aside className="md:col-span-3 lg:col-span-3 sticky top-6">
            <SidebarLeft />
          </aside>

          {/* Center Column - Main Feed & Post Tool (col-span-6) */}
          <main className="md:col-span-6 lg:col-span-6 flex flex-col gap-6">
            <PostCreator />
            <ActivityFeed />
          </main>

          {/* Right Column - Discovery & News (col-span-3) */}
          <aside className="md:col-span-3 lg:col-span-3 flex flex-col gap-6 sticky top-6">
            <ConnectionDiscovery />
            <ComplianceNews />
          </aside>

        </div>
      </div>
    </div>
  );
}
