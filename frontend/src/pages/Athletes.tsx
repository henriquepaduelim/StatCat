import { useAuthStore } from "../stores/useAuthStore";
import AdminAthletesView from "../components/athletes/AdminAthletesView";
import ReadOnlyAthletesView from "../components/athletes/ReadOnlyAthletesView";

const Athletes = () => {
  const currentUser = useAuthStore((state) => state.user);
  const role = (currentUser?.role || "").toLowerCase();
  const isReadOnly = role === "athlete" || role === "coach";

  return isReadOnly ? <ReadOnlyAthletesView /> : <AdminAthletesView />;
};

export default Athletes;
