import CollabEditor from "@/src/components/CollabEditor";

export const metadata = { title: "Live Collaboration", description: "Edit rich-text documents together with live presence and conflict-free synchronization." };

export default function CollaborationPage() {
  return <CollabEditor />;
}
