import { requireUser } from '@/lib/auth';
import MapViewer from '@/components/MapViewer';
import { WORLD_NAME } from '@/lib/world';

export default async function MapPage() {
  await requireUser();
  return (
    <>
      <h1>Map of {WORLD_NAME}</h1>
      <p className="sub">The known world, as far as the table knows it.</p>
      <MapViewer />
    </>
  );
}
