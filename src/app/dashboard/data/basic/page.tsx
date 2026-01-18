/* ------------------------------------------------------------------ */
/*  src/app/dashboard/data/basic/page.tsx                             */
/* ------------------------------------------------------------------ */
import DataFolderCard from "@/components/dashboard/data/DataFolderCard";
import RecentActivityStrip from "@/components/dashboard/data/RecentActivityStrip";
import AllFilesTable from "@/components/dashboard/data/AllFilesTable";

export default function DataBasicPage() {
  return (
    <div className="space-y-8">
      {/* Folder cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <DataFolderCard
          title="Customer Data"
          itemsLabel="215 Items"
          usedLabel="3.5 GB out of 32"
          percent={0.28}
          iconKind="users"
          href="/dashboard/data/customer-data"
        />
        <DataFolderCard
          title="Events"
          itemsLabel="180 Items"
          usedLabel="2.5 GB out of 32"
          percent={0.21}
          iconKind="calendar"
          href="/dashboard/data/events"
        />
        <DataFolderCard
          title="Documents"
          itemsLabel="752 Items"
          usedLabel="29 GB out of 32"
          percent={0.92}
          iconKind="doc"
          href="/dashboard/data/documents"
        />
        <DataFolderCard
          title="Images"
          itemsLabel="1002 Items"
          usedLabel="5.6 GB out of 32"
          percent={0.34}
          iconKind="image"
          href="/dashboard/data/images"
        />
        <DataFolderCard
          title="Others"
          itemsLabel="732 Items"
          usedLabel="16.7 GB out of 32"
          percent={0.62}
          iconKind="folder"
          href="/dashboard/data/others"
        />
      </div>

      {/* Recent Activity */}
      <RecentActivityStrip />

      {/* ✅ Rename Recent Files -> All Files */}
      <AllFilesTable />
    </div>
  );
}
